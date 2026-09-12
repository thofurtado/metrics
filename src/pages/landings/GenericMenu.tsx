function sectorsMinTime(profile: any): number | null {
  let sectors = profile?.deliverySectors || profile?.delivery_sectors || []
  if (typeof sectors === 'string') {
    try { sectors = JSON.parse(sectors) } catch { sectors = [] }
  }
  if (!Array.isArray(sectors) || sectors.length === 0) return null
  const times = sectors.map((s: any) => Number(s.estimatedTimeMin) || 0).filter((t: number) => t > 0)
  return times.length ? Math.min(...times) : null
}


function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  Banknote,
  Bell,
  Bike,
  Check,
  CheckCircle2,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  CreditCard,
  FileText,
  Info,
  Loader2,
  MapPin,
  MessageCircle,
  Minus,
  Pencil,
  Plus,
  QrCode,
  RefreshCw,
  Rocket,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
  Ticket,
  Truck,
  User,
  UtensilsCrossed,
  X,
  Zap,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/axios'
import { cn, resolveImageUrl } from '@/lib/utils'
import { ItemCustomizerDialog, ProductItem, CustomizedItemResult } from './components/ItemCustomizerDialog'


function playChimeAlert() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880.00, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {}
}

async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch (e) {
    return 'denied';
  }
}

// Registra o Service Worker para Notificações no Android / Mobile
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((e) => console.log('SW register info:', e));
  });
}

async function showBrowserNotification(title: string, options?: NotificationOptions) {
  if (typeof window === 'undefined') return;

  // Toca alerta sonoro e vibração (sempre, independente de permissão)
  playChimeAlert();
  if ('vibrate' in navigator) {
    try { navigator.vibrate([200, 100, 200, 100, 300]); } catch (e) {}
  }

  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const notifOptions = {
    ...options,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: options?.tag || ('order-status-' + (options?.data?.order_id || 'live')),
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: options?.data || {}
  };

  try {
    // Tenta via Service Worker (obrigatório no Chrome Android)
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      // Usa getRegistration com timeout para não travar se o SW não estiver pronto
      const reg = await Promise.race([
        navigator.serviceWorker.getRegistration(),
        new Promise<undefined>((r) => setTimeout(() => r(undefined), 3000))
      ]);
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, notifOptions as any);
        return;
      }
    }
    // Fallback: tenta new Notification (funciona no desktop, falha no mobile)
    try {
      const n = new Notification(title, notifOptions as any);
      if (notifOptions?.data?.url) {
        n.onclick = () => {
          window.open(notifOptions.data.url, '_blank');
        };
      }
    } catch (e) {}
  } catch (e) {
    try { new Notification(title, options); } catch (err) {}
  }
}



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
  imageUrl?: string
  is_priority?: boolean
  show_on_menu?: boolean
  subcategory?: {
    id: string
    name: string
    accepts_fractions: boolean
    max_fractions: number
  } | null
  complementGroups?: {
    id: string
    name: string
    min_quantity: number
    max_quantity: number
    free_quantity: number
    options: {
      id: string
      name: string
      price: number
    }[]
  }[]
}

interface CartItem {
  id: string
  product: Product
  displayName?: string
  unitPrice: number
  quantity: number
  observation?: string
  fractions?: string[]
  selectedOptions?: {
    groupId: string
    groupName: string
    optionId: string
    optionName: string
    price: number
    quantity: number
  }[]
}

const DAYS_OF_WEEK = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
]

async function fetchMenu() {
  try {
    const response = await api.get<any>('/public/menu')
    let items: any[] = []
    if (Array.isArray(response.data)) {
      items = response.data
    } else if (response.data && Array.isArray(response.data.products)) {
      items = response.data.products
    }
    // Failsafe: garante que apenas itens marcados com show_on_menu (ou padrão true) apareçam no cardápio
    return items.filter((p: any) => p.show_on_menu !== false)
  } catch (error) {
    console.error('Erro ao buscar cardápio público:', error)
    return []
  }
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0)
}

// Gerador Oficial do Padrão BR Code Pix BACEN (EMV QRCPS-MPM) com Valor Exato
function crc16(str: string): string {
  let crc = 0xffff
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021
      } else {
        crc = crc << 1
      }
      crc = crc & 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

// Normalizador de Chaves Pix segundo o padrão do Banco Central (BACEN / DICT)
function normalizePixKey(key: string): string {
  if (!key) return ''
  const clean = key.trim()

  // 1. E-mail: minúsculo
  if (clean.includes('@')) {
    return clean.toLowerCase()
  }

  // 2. Chave Aleatória (EVP / UUID): 36 caracteres
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      clean,
    )
  ) {
    return clean.toLowerCase()
  }

  const digitsOnly = clean.replace(/\D/g, '')

  // 3. Telefone sem código de país (+55): ex: 12992193644 -> +5512992193644
  if (digitsOnly.length === 10 || digitsOnly.length === 11) {
    return `+55${digitsOnly}`
  }

  // 4. Telefone com 55 mas sem o sinal de +: ex: 5512992193644 -> +5512992193644
  if (
    (digitsOnly.length === 12 || digitsOnly.length === 13) &&
    digitsOnly.startsWith('55') &&
    !clean.startsWith('+')
  ) {
    return `+${digitsOnly}`
  }

  // 5. CPF (11 dig) ou CNPJ (14 dig)
  if (digitsOnly.length === 11 || digitsOnly.length === 14) {
    return digitsOnly
  }

  return clean
}

function generatePixBRCode({
  pixKey,
  merchantName,
  merchantCity,
  amount,
}: {
  pixKey: string
  merchantName: string
  merchantCity: string
  amount: number
}): string {
  if (!pixKey || !pixKey.trim()) return ''

  const cleanKey = normalizePixKey(pixKey)
  const rawName = (merchantName || 'METRICS LOJA')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .toUpperCase()
  const cleanName = (rawName || 'LOJA').substring(0, 25)
  const rawCity = (merchantCity || 'SAO PAULO')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .toUpperCase()
  const cleanCity = (rawCity || 'SAO PAULO').substring(0, 15)
  const formattedAmount = (amount || 0).toFixed(2)

  const merchantAccountInfo =
    '0014br.gov.bcb.pix' +
    '01' +
    cleanKey.length.toString().padStart(2, '0') +
    cleanKey

  const payload =
    '000201' +
    '26' +
    merchantAccountInfo.length.toString().padStart(2, '0') +
    merchantAccountInfo +
    '52040000' +
    '5303986' +
    '54' +
    formattedAmount.length.toString().padStart(2, '0') +
    formattedAmount +
    '5802BR' +
    '59' +
    cleanName.length.toString().padStart(2, '0') +
    cleanName +
    '60' +
    cleanCity.length.toString().padStart(2, '0') +
    cleanCity +
    '62070503***' +
    '6304'

  const checksum = crc16(payload)
  return payload + checksum
}

// Utilitário para verificar se a loja está aberta no momento (suporte a múltiplos turnos por dia)
function checkIsOpen(profile: any) {
  if (!profile) return { isOpen: true, reason: 'Aberto' }
  if (profile.isOpenManual === false) {
    return { isOpen: false, reason: 'Pausa manual ativada' }
  }

  const now = new Date()
  const currentDayOfWeek = now.getDay() // 0 = Dom, 1 = Seg...
  const currentHours = String(now.getHours()).padStart(2, '0')
  const currentMinutes = String(now.getMinutes()).padStart(2, '0')
  const currentTime = `${currentHours}:${currentMinutes}`

  const businessHours: any[] = profile.businessHours || []
  const todaySchedules = businessHours.filter(
    (bh: any) => bh.dayOfWeek === currentDayOfWeek && bh.isOpen,
  )

  if (!todaySchedules || todaySchedules.length === 0) {
    return { isOpen: false, reason: 'Fechado hoje' }
  }

  // Verifica se o horário atual está dentro de algum dos turnos ativos hoje
  const activeShift = todaySchedules.find((schedule: any) => {
    const { openTime, closeTime } = schedule
    if (!openTime || !closeTime) return false
    if (closeTime > openTime) {
      return currentTime >= openTime && currentTime <= closeTime
    } else {
      // Turno que vira a madrugada (ex: 18:00 às 02:00)
      return currentTime >= openTime || currentTime <= closeTime
    }
  })

  if (activeShift) {
    return { isOpen: true, reason: 'Aberto' }
  }

  // Se não está aberto agora, busca o próximo turno de hoje (se houver)
  const upcomingToday = todaySchedules
    .filter((s: any) => s.openTime && s.openTime > currentTime)
    .sort((a: any, b: any) => a.openTime.localeCompare(b.openTime))[0]

  if (upcomingToday) {
    return { isOpen: false, reason: `Fechado (Abre às ${upcomingToday.openTime})` }
  }

  return { isOpen: false, reason: 'Fechado no momento' }
}

// Subcomponente: Dynamic Hero Background (Preenchimento Absoluto)
const DynamicHero = ({ profile }: { profile: any }) => {
  if (profile?.banner_url) {
    return (
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={resolveImageUrl(profile.banner_url)}
          className="h-full w-full object-cover object-center"
          alt="Banner do Estabelecimento"
        />
      </div>
    )
  }

  // Generative Ultra-Premium Animated Mesh Banner (Modo Cor Sem Imagem)
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ backgroundColor: 'var(--primary-color, #FF5722)' }}
    >
      {/* Sobreposição de Gradientes Radiais Mesh */}
      <div
        className="absolute inset-0 opacity-50 mix-blend-overlay"
        style={{
          backgroundImage: `
            radial-gradient(circle at 15% 20%, rgba(255, 255, 255, 0.95) 0%, transparent 45%),
            radial-gradient(circle at 85% 80%, rgba(0, 0, 0, 0.8) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.3) 0%, transparent 60%)
          `,
        }}
      />

      {/* Padrão Geométrico Sutil */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:28px_28px] opacity-15" />

      {/* Orbes de Luz Flutuantes Animadas (Bokeh) */}
      <motion.div
        animate={{
          scale: [1, 1.25, 1],
          x: [0, 25, 0],
          y: [0, -15, 0],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/30 blur-3xl"
      />

      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          x: [0, -30, 0],
          y: [0, 20, 0],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute -bottom-24 -left-20 h-96 w-96 rounded-full bg-black/40 blur-3xl"
      />
    </div>
  )
}

function formatMeasureUnit(unit?: string) {
  if (!unit) return ''
  const u = unit.trim().toUpperCase()
  if (u === 'UNITARY' || u === 'UN') return 'Unitário'
  if (u === 'FRACTIONAL') return 'Fracionado'
  if (u === 'KG') return 'Kg'
  if (u === 'G') return 'g'
  if (u === 'L') return 'L'
  if (u === 'ML') return 'ml'
  return unit
}

export default function GenericMenu({ tenantName, profile }: GenericMenuProps) {
  // Garante que o cardápio público esteja SEMPRE no modo Claro (Light), independente do tema da retaguarda
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

  const [cart, setCart] = useState<Record<string, CartItem>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [customizingProduct, setCustomizingProduct] = useState<ProductItem | null>(null)
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [isCartModalOpen, setIsCartModalOpen] = useState(false)
  const [isStoreInfoOpen, setIsStoreInfoOpen] = useState(false)

  // Estados do Modal de Checkout Robusto (iFood / Anota AI / Marujo Standard)
  const [isCheckoutStepOpen, setIsCheckoutStepOpen] = useState(false)
  const [checkoutWizardStep, setCheckoutWizardStep] = useState<1 | 2 | 3 | 4>(1)
  const [lastOrderText, setLastOrderText] = useState('')
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null)
  const [lastOrderTotal, setLastOrderTotal] = useState<number>(0)
  const [createdDisplayId, setCreatedDisplayId] = useState<number | null>(null)
  const [liveOrderStatus, setLiveOrderStatus] = useState<string>('pending')
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false)
  const [pushNotificationEnabled, setPushNotificationEnabled] = useState(false)
  const [fulfillmentType, setFulfillmentType] = useState<
    'DELIVERY' | 'TAKEOUT'
  >('DELIVERY')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [street, setStreet] = useState('')
  const [number, setNumber] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zipcode, setZipcode] = useState('')
  const [complement, setComplement] = useState('')
  const [referencePoint, setReferencePoint] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<
    'PIX' | 'CREDIT' | 'DEBIT' | 'CASH'
  >('PIX')
  const [changeAmount, setChangeAmount] = useState('')
  const [isSearchingCEPCheckout, setIsSearchingCEPCheckout] = useState(false)
  const [isCopiedPix, setIsCopiedPix] = useState(false)
  const [pixTimerSeconds, setPixTimerSeconds] = useState(15 * 60)

  useEffect(() => {
    if (checkoutWizardStep === 3 && paymentMethod === 'PIX') {
      const timer = setInterval(() => {
        setPixTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0))
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [checkoutWizardStep, paymentMethod])

  const formatCountdown = (totalSecs: number) => {
    const m = Math.floor(totalSecs / 60)
    const s = totalSecs % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  // Estados de Busca do Cliente Marujo & Múltiplos Endereços
  const [clientFound, setClientFound] = useState(false)
  const [isLoadingPhone, setIsLoadingPhone] = useState(false)
  const [savedAddresses, setSavedAddresses] = useState<any[]>([])
  const [addressReadonly, setAddressReadonly] = useState(false)
  const [isNewAddress, setIsNewAddress] = useState(false)
  const [isAddressesModalOpen, setIsAddressesModalOpen] = useState(false)
  const [phoneSearchToast, setPhoneSearchToast] = useState<{
    type: 'success' | 'info' | 'error'
    message: string
  } | null>(null)
  const [unsupportedNeighborhoodModal, setUnsupportedNeighborhoodModal] = useState<{
    isOpen: boolean
    neighborhoodName: string
  } | null>(null)
  const [isNeighborhoodPickerOpen, setIsNeighborhoodPickerOpen] = useState(false)
  const [customReferenceNote, setCustomReferenceNote] = useState('')
  const [selectedReferenceNeighbor, setSelectedReferenceNeighbor] = useState('')

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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value)
    setCustomerPhone(formatted)
    const raw = formatted.replace(/\D/g, '')
    if (raw.length >= 10) {
      handlePhoneSearch(raw)
    }
  }

  const handlePhoneSearch = async (overrideRawPhone?: string) => {
    const rawPhone = (overrideRawPhone || customerPhone).replace(/\D/g, '')
    if (rawPhone.length < 10) return

    setIsLoadingPhone(true)
    setPhoneSearchToast(null)

    try {
      const res = await api.get(`/public/clients/phone/${rawPhone}`)
      if (res.data && res.data.client) {
        const client = res.data.client
        setCustomerName(client.name || '')
        setClientFound(true)

        if (client.addresses && client.addresses.length > 0) {
          setSavedAddresses(client.addresses)
          const addr = client.addresses[0]
          setZipcode(
            addr.zipcode
              ? formatCep(addr.zipcode.toString().padStart(8, '0'))
              : '',
          )
          setStreet(addr.street || '')
          setNumber(addr.number ? addr.number.toString() : '')
          setCity(addr.city || '')
          setState(addr.state || '')

          if (fulfillmentType === 'DELIVERY' && availableNeighborhoodsList.length > 0) {
            const isAllowed = availableNeighborhoodsList.some(
              (n) => normalizeText(n) === normalizeText(addr.neighborhood)
            )
            if (!isAllowed) {
              setNeighborhood('')
              setAddressReadonly(false)
              setIsNewAddress(true)
              setUnsupportedNeighborhoodModal({
                isOpen: true,
                neighborhoodName: addr.neighborhood || '',
              })
              setPhoneSearchToast({
                type: 'info',
                message: `Seu endereço cadastrado (${addr.neighborhood || ''}) não está na nossa área de entrega padrão.`,
              })
              return
            }
          }

          setNeighborhood(addr.neighborhood || '')
          setAddressReadonly(true)
          setIsNewAddress(false)
        } else {
          setSavedAddresses([])
          setAddressReadonly(false)
          setIsNewAddress(true)
        }

        setPhoneSearchToast({
          type: 'success',
          message: `Cliente ${client.name || ''} localizado!`,
        })
      } else {
        throw new Error('Cliente não encontrado')
      }
    } catch {
      setClientFound(false)
      setSavedAddresses([])
      setAddressReadonly(false)
      setIsNewAddress(true)
      setCustomerName('')
      setZipcode('')
      setStreet('')
      setNumber('')
      setNeighborhood('')
      setCity('')
      setState('')

      setPhoneSearchToast({
        type: 'info',
        message:
          'Cliente não cadastrado. Preencha seus dados abaixo para se cadastrar!',
      })

      // Pula para o campo Nome automaticamente
      setTimeout(() => {
        document.getElementById('name-input')?.focus()
      }, 150)
    } finally {
      setIsLoadingPhone(false)
      setTimeout(() => setPhoneSearchToast(null), 4000)
    }
  }

  const handleSelectSavedAddress = (addr: any) => {
    if (fulfillmentType === 'DELIVERY' && availableNeighborhoodsList.length > 0) {
      const isAllowed = availableNeighborhoodsList.some(
        (n) => normalizeText(n) === normalizeText(addr.neighborhood)
      )
      if (!isAllowed) {
        setUnsupportedNeighborhoodModal({
          isOpen: true,
          neighborhoodName: addr.neighborhood || '',
        })
        return
      }
    }
    setZipcode(
      addr.zipcode ? formatCep(addr.zipcode.toString().padStart(8, '0')) : '',
    )
    setStreet(addr.street || '')
    setNumber(addr.number ? addr.number.toString() : '')
    setNeighborhood(addr.neighborhood || '')
    setCity(addr.city || '')
    setState(addr.state || '')
    setAddressReadonly(true)
    setIsNewAddress(false)
    setIsAddressesModalOpen(false)
  }

  const handleNewAddress = () => {
    setAddressReadonly(false)
    setIsNewAddress(true)
    setZipcode('')
    setStreet('')
    setNumber('')
    setNeighborhood('')
    setCity('')
    setState('')
    setTimeout(() => {
      document.getElementById('zipcode-input')?.focus()
    }, 100)
  }

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawCep = e.target.value.replace(/\D/g, '')
    setZipcode(formatCep(rawCep))

    if (rawCep.length === 8) {
      setIsSearchingCEPCheckout(true)
      try {
        const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${rawCep}`)
        if (!res.ok) throw new Error('CEP não encontrado')

        const data = await res.json()
        setStreet(data.street || '')
        setCity(data.city || '')
        setState(data.state || '')
        const matched = matchNeighborhoodWithConfig(data.neighborhood || '')
        if (matched) {
          setNeighborhood(matched)
        } else {
          setNeighborhood('')
          if (availableNeighborhoodsList.length > 0) {
            setUnsupportedNeighborhoodModal({
              isOpen: true,
              neighborhoodName: data.neighborhood || '',
            })
          }
        }

        setTimeout(() => {
          document.getElementById('number-input')?.focus()
        }, 100)
      } catch (err) {
        console.error(err)
      } finally {
        setIsSearchingCEPCheckout(false)
      }
    }
  }

  const handleCopyPixKey = (key: string) => {
    navigator.clipboard.writeText(key)
    setIsCopiedPix(true)
    setTimeout(() => setIsCopiedPix(false), 3000)
  }

  const { data: products, isLoading } = useQuery({
    queryKey: ['public-menu'],
    queryFn: fetchMenu,
    staleTime: 1000 * 60 * 5,
  })

  const storeStatus = useMemo(() => checkIsOpen(profile), [profile])

  const normalizeText = (text: string) => {
    return (text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
  }

  const availableNeighborhoodsList = useMemo(() => {
    let sectors = profile?.deliverySectors || profile?.delivery_sectors || []
    if (typeof sectors === 'string') {
      try {
        sectors = JSON.parse(sectors)
      } catch {
        sectors = []
      }
    }
    if (!Array.isArray(sectors)) sectors = []

    // Restringe estritamente aos bairros associados a um setor de entrega cadastrado
    const fromSectors = sectors.flatMap((s: any) => s.neighborhoods || [])
    const unique = Array.from(
      new Set(fromSectors),
    ).filter(Boolean) as string[]
    return unique.sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [profile])

  const resolvedDeliveryTime = useMemo(() => {
    if (fulfillmentType !== 'DELIVERY' || !neighborhood) return null
    let sectors = profile?.deliverySectors || profile?.delivery_sectors || []
    if (typeof sectors === 'string') {
      try { sectors = JSON.parse(sectors) } catch { sectors = [] }
    }
    if (Array.isArray(sectors)) {
      const foundSec = sectors.find((s: any) =>
        (s.neighborhoods || []).some(
          (n: string) => normalizeText(n) === normalizeText(neighborhood)
        )
      )
      if (foundSec && (foundSec.estimatedTimeMin || foundSec.estimatedTimeMax)) {
        return {
          min: Number(foundSec.estimatedTimeMin) || 30,
          max: Number(foundSec.estimatedTimeMax) || 60,
        }
      }
    }
    if (profile?.deliveryTimeMin) {
      return {
        min: Number(profile.deliveryTimeMin),
        max: Number(profile.deliveryTimeMax || 60),
      }
    }
    return null
  }, [fulfillmentType, neighborhood, profile])

  const deliverySectorInfo = useMemo(() => {
    let sectors = profile?.deliverySectors || profile?.delivery_sectors || []
    if (typeof sectors === 'string') {
      try {
        sectors = JSON.parse(sectors)
      } catch {
        sectors = []
      }
    }
    if (!Array.isArray(sectors)) sectors = []
    if (sectors.length === 0) {
      return { hasSectors: false, minFee: Number(profile?.deliveryFee || 0) }
    }
    const fees = sectors.map((s: any) => Number(s.fee) || 0)
    const minFee = Math.min(...fees)
    const maxFee = Math.max(...fees)
    return { hasSectors: true, minFee, maxFee, sectors }
  }, [profile])

  const matchNeighborhoodWithConfig = (cepNeighborhood: string) => {
    if (!cepNeighborhood || !availableNeighborhoodsList.length) {
      return ''
    }
    const target = normalizeText(cepNeighborhood)
    const exact = availableNeighborhoodsList.find(
      (n) => normalizeText(n) === target,
    )
    if (exact) return exact

    const partial = availableNeighborhoodsList.find((n) => {
      const norm = normalizeText(n)
      return norm.includes(target) || target.includes(norm)
    })
    if (partial) return partial

    return ''
  }

  const rawProducts = useMemo(() => {
    return Array.isArray(products) ? products : []
  }, [products])

  const categories = useMemo(() => {
    if (!rawProducts.length) return ['All']
    const cats = Array.from(new Set(rawProducts.map((p) => p.category || 'Geral')))
    return ['All', ...cats]
  }, [rawProducts])

  useEffect(() => {
    if (categories.length > 1 && activeCategory === 'All') {
      setActiveCategory('All')
    }
  }, [categories, activeCategory])

  const filteredProducts = useMemo(() => {
    let filtered = rawProducts

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q)),
      )
    } else if (activeCategory !== 'All') {
      filtered = filtered.filter(
        (p) => (p.category || 'Geral') === activeCategory,
      )
    }
    return filtered
  }, [rawProducts, searchQuery, activeCategory])

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

  const handleProductClick = (product: Product) => {
    const hasComplements =
      product.complementGroups && product.complementGroups.length > 0
    const acceptsFractions = Boolean(product.subcategory?.accepts_fractions)

    if (hasComplements || acceptsFractions) {
      setCustomizingProduct(product as ProductItem)
      setIsCustomizerOpen(true)
    } else {
      handleAddToCart(product)
    }
  }

  const handleConfirmCustomizedItem = (result: CustomizedItemResult) => {
    setCart((prev) => {
      const existing = prev[result.customKey]
      if (existing) {
        return {
          ...prev,
          [result.customKey]: {
            ...existing,
            quantity: existing.quantity + result.quantity,
            observation: result.observation || existing.observation,
          },
        }
      }
      return {
        ...prev,
        [result.customKey]: {
          id: result.customKey,
          product: result.product as Product,
          displayName: result.displayName,
          unitPrice: result.unitPrice,
          quantity: result.quantity,
          observation: result.observation,
          fractions: result.fractions,
          selectedOptions: result.selectedOptions,
        },
      }
    })
  }

  const handleAddToCart = (product: Product, obs?: string) => {
    const customKey = product.id
    setCart((prev) => {
      const existing = prev[customKey]
      if (existing) {
        return {
          ...prev,
          [customKey]: {
            ...existing,
            quantity: existing.quantity + 1,
            observation: obs !== undefined ? obs : existing.observation,
          },
        }
      }
      return {
        ...prev,
        [customKey]: {
          id: customKey,
          product,
          displayName: product.name,
          unitPrice: product.price,
          quantity: 1,
          observation: obs || '',
        },
      }
    })
  }

  const handleIncrementCartItem = (cartItemId: string) => {
    setCart((prev) => {
      const existing = prev[cartItemId]
      if (!existing) return prev
      return {
        ...prev,
        [cartItemId]: {
          ...existing,
          quantity: existing.quantity + 1,
        },
      }
    })
  }

  const handleRemoveFromCart = (cartItemId: string) => {
    setCart((prev) => {
      const existing = prev[cartItemId]
      if (!existing) return prev
      if (existing.quantity <= 1) {
        const newCart = { ...prev }
        delete newCart[cartItemId]
        return newCart
      }
      return {
        ...prev,
        [cartItemId]: { ...existing, quantity: existing.quantity - 1 },
      }
    })
  }

  const handleUpdateItemObs = (cartItemId: string, obs: string) => {
    setCart((prev) => {
      const existing = prev[cartItemId]
      if (!existing) return prev
      return { ...prev, [cartItemId]: { ...existing, observation: obs } }
    })
  }

  const getProductCartCount = (productId: string) => {
    return Object.values(cart)
      .filter((item) => item.product.id === productId)
      .reduce((sum, item) => sum + item.quantity, 0)
  }

  const resolvedDeliveryFee = useMemo(() => {
    if (fulfillmentType !== 'DELIVERY') return 0

    if (neighborhood && neighborhood.trim()) {
      let sectors = profile?.deliverySectors || profile?.delivery_sectors || []
      if (typeof sectors === 'string') {
        try { sectors = JSON.parse(sectors) } catch { sectors = [] }
      }
      if (!Array.isArray(sectors)) sectors = []
      const foundSector = sectors.find((s: any) =>
        (s.neighborhoods || []).some(
          (n: string) => normalizeText(n) === normalizeText(neighborhood),
        ),
      )
      if (foundSector) {
        return Number(foundSector.fee) || 0
      }
    }

    return Number(profile?.deliveryFee || 0)
  }, [fulfillmentType, neighborhood, profile])

  const cartItems = Object.values(cart)
  const cartSubtotal = cartItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  )
  const deliveryFee = resolvedDeliveryFee
  const cartTotal = cartSubtotal + deliveryFee
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  const minOrderValue = Number(profile?.minOrderValue || 0)
  const isMinOrderSatisfied = cartSubtotal >= minOrderValue

  const pixBRCodePayload = useMemo(() => {
    const key = profile?.pixKey || profile?.whatsappNumber || ''
    if (!key) return ''
    return generatePixBRCode({
      pixKey: key,
      merchantName: profile?.tradeName || tenantName,
      merchantCity: profile?.city || 'SAO PAULO',
      amount: cartTotal,
    })
  }, [profile, tenantName, cartTotal])

  const handleOpenCheckout = () => {
    if (!storeStatus.isOpen) {
      alert(`O estabelecimento está fechado no momento: ${storeStatus.reason}`)
      return
    }
    if (!isMinOrderSatisfied) {
      alert(`O valor mínimo para pedido é de ${formatCurrency(minOrderValue)}.`)
      return
    }
    setCheckoutWizardStep(2)
    setIsCheckoutStepOpen(true)
    setIsCartModalOpen(false)
  }

  const registerClientInBackend = async () => {
    if (!customerName.trim() || !customerPhone.trim()) return
    try {
      const rawPhone = customerPhone.replace(/\D/g, '')
      const rawZipcode = zipcode.replace(/\D/g, '')

      const payload = {
        name: customerName,
        phone: rawPhone,
        street: fulfillmentType === 'DELIVERY' ? street : 'Retirada no Balcão',
        number: fulfillmentType === 'DELIVERY' ? number || '0' : '0',
        neighborhood: fulfillmentType === 'DELIVERY' ? neighborhood : 'Balcão',
        city:
          fulfillmentType === 'DELIVERY'
            ? city || profile?.city || 'Local'
            : profile?.city || 'Local',
        state:
          fulfillmentType === 'DELIVERY'
            ? state || profile?.state || 'SP'
            : profile?.state || 'SP',
        zipcode:
          fulfillmentType === 'DELIVERY' && rawZipcode ? rawZipcode : undefined,
        complement: complement || undefined,
        isNewAddress,
      }

      const res = await api.post('/public/checkout/client', payload)
      if (res.data && res.data.client) {
        setClientFound(true)
        if (res.data.client.addresses) {
          setSavedAddresses(res.data.client.addresses)
        }
      }
    } catch (clientErr) {
      console.warn('Aviso ao sincronizar cliente com backend:', clientErr)
    }
  }

  const handleFinalizeOrder = async () => {
    if (isSubmittingOrder) return;
    setIsSubmittingOrder(true);

    // PASSO 1: Pedir permissão IMEDIATAMENTE no clique do usuário (User Gesture obrigatório).
    // await Notification.requestPermission() DEVE ser a primeiríssima coisa no onClick.
    let pushGranted = false;
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        pushGranted = true;
      } else if (Notification.permission === 'default') {
        try {
          const perm = await Notification.requestPermission();
          pushGranted = (perm === 'granted');
        } catch (e) {}
      }
      if (pushGranted) setPushNotificationEnabled(true);
    }

    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Por favor, preencha seu nome e WhatsApp.')
      setCheckoutWizardStep(2)
      return
    }

    if (fulfillmentType === 'DELIVERY') {
      if (!street.trim() || !number.trim() || !neighborhood.trim()) {
        alert('Por favor, preencha o endereço completo de entrega.')
        setCheckoutWizardStep(2)
        return
      }
      if (availableNeighborhoodsList.length > 0) {
        const isAllowed = availableNeighborhoodsList.some(
          (n) => normalizeText(n) === normalizeText(neighborhood)
        )
        if (!isAllowed) {
          setUnsupportedNeighborhoodModal({
            isOpen: true,
            neighborhoodName: neighborhood,
          })
          setCheckoutWizardStep(2)
          return
        }
      }
    }

    try {
      // 1. Registra dados do cliente no backend via API publica
      await registerClientInBackend()

      let orderApiRes: any = null
      // 2. Envia pedido para fila de sincronização do PDV
      try {
        orderApiRes = await api.post('/public/orders', {
          client_name: customerName,
          client_phone: customerPhone,
          street: street || 'Retirada no Balcão',
          number: number || 'S/N',
          neighborhood: neighborhood || 'Geral',
          city: city || 'Local',
          state: state || 'UF',
          zipcode: zipcode || undefined,
          complement: complement || undefined,
          reference: referencePoint || undefined,
          payment_method_name:
            paymentMethod === 'PIX'
              ? 'PIX'
              : paymentMethod === 'CREDIT'
                ? 'Cartão de Crédito'
                : paymentMethod === 'DEBIT'
                  ? 'Cartão de Débito'
                  : 'Dinheiro',
          change_for: changeAmount ? Number(changeAmount) : undefined,
          delivery_fee: fulfillmentType === 'DELIVERY' ? resolvedDeliveryFee : 0,
          total_amount: cartTotal,
          notes: `${fulfillmentType === 'DELIVERY' ? 'Entrega (Delivery)' : 'Retirada no Balcão'}${customReferenceNote ? ` [${customReferenceNote}]` : ''}`,
          items: cartItems.map((item) => ({
            product_id: item.product.id,
            name: item.displayName || item.product.name,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            notes: item.observation || undefined,
            complements: (item.selectedOptions || []).map((c) => ({
              name: c.optionName,
              price: c.price,
              quantity: c.quantity,
            })),
            fractions: (item.fractions || []).map((f) => ({
              product_id: item.product.id,
              name: f,
              fraction: 1 / Math.max(1, (item.fractions || []).length),
            })),
          })),
        })
      } catch (orderApiErr: any) {
        console.error('Erro ao enviar pedido para o caixa (PDV):', orderApiErr)
        setIsSubmittingOrder(false)
        const errorMsg = orderApiErr?.response?.data?.message || 'Erro ao registrar pedido no caixa.'
        if (errorMsg.toLowerCase().includes('área de entrega') || errorMsg.toLowerCase().includes('bairro')) {
          setUnsupportedNeighborhoodModal({
            isOpen: true,
            neighborhoodName: neighborhood,
          })
          setCheckoutWizardStep(2)
        } else {
          alert(`Não foi possível registrar o pedido no caixa: ${errorMsg}`)
        }
        return
      }

      // 3. Formata mensagem estruturada ultra-profissional para o WhatsApp
      const now = new Date()
      const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`
      const formattedTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

      let text = `🧾 *NOVO PEDIDO - ${(profile?.tradeName || tenantName).toUpperCase()}*\n`
      text += `📅 _${formattedDate} às ${formattedTime}_\n`
      text += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
      text += `👤 *Cliente:* ${customerName}\n`
      text += `📱 *WhatsApp:* ${customerPhone}\n`
      text += `🛵 *Tipo:* ${
        fulfillmentType === 'DELIVERY'
          ? 'Entrega (Delivery)'
          : fulfillmentType === 'TAKEOUT'
            ? 'Retirada no Balcão'
            : 'Consumo no Local'
      }\n`

      if (fulfillmentType === 'DELIVERY') {
        text += `\n📍 *Endereço de Entrega:*\n`
        text += `> ${street}, ${number || 'S/N'}\n`
        if (complement) text += `> Complemento: ${complement}\n`
        text += `> ${neighborhood} - ${city || profile?.city || 'Local'}/${state || profile?.state || 'SP'}\n`
        if (zipcode) text += `> CEP: ${zipcode}\n`
        if (customReferenceNote) {
          text += `> ⚠️ *${customReferenceNote}*\n`
        }
      }

      text += `\n━━━━━━━━━━━━━━━━━━━━━━━━\n`
      text += `📋 *ITENS DO PEDIDO:*\n\n`

      cartItems.forEach((item) => {
        const itemTitle = item.displayName || item.product.name
        const itemTotal = item.unitPrice * item.quantity
        text += `▪️ *${item.quantity}x* ${itemTitle}\n`
        text += `   _${formatCurrency(itemTotal)}_\n`
        if (item.observation) {
          text += `   ↳ 💬 _Obs: ${item.observation}_\n`
        }
        if (item.selectedOptions && item.selectedOptions.length > 0) {
          item.selectedOptions.forEach((opt) => {
            text += `   ↳ ➕ ${opt.quantity > 1 ? `${opt.quantity}x ` : ''}${opt.optionName} (${formatCurrency(opt.price * opt.quantity)})\n`
          })
        }
        if (item.fractions && item.fractions.length > 0) {
          text += `   ↳ 🍕 Sabores: ${item.fractions.join(' / ')}\n`
        }
        text += `\n`
      })

      text += `━━━━━━━━━━━━━━━━━━━━━━━━\n`
      text += `💵 Subtotal: *${formatCurrency(cartSubtotal)}*\n`
      if (fulfillmentType === 'DELIVERY' && resolvedDeliveryFee > 0) {
        text += `🛵 Taxa de Entrega: *${formatCurrency(resolvedDeliveryFee)}*\n`
      } else if (fulfillmentType === 'DELIVERY') {
        text += `🛵 Taxa de Entrega: *Grátis*\n`
      }
      text += `💰 *TOTAL: ${formatCurrency(cartTotal)}*\n\n`

      if (paymentMethod === 'PIX') {
        text += `💳 *Forma de Pagamento:* Pix\n`
      } else if (paymentMethod === 'CREDIT') {
        text += `💳 *Forma de Pagamento:* Cartão de Crédito (na entrega)\n`
      } else if (paymentMethod === 'DEBIT') {
        text += `💳 *Forma de Pagamento:* Cartão de Débito (na entrega)\n`
      } else {
        const trocoNum = parseFloat((changeAmount || '0').replace(',', '.'))
        if (trocoNum > cartTotal) {
          const levarTroco = trocoNum - cartTotal
          text += `💳 *Forma de Pagamento:* Dinheiro\n`
          text += `💵 *Troco para:* ${formatCurrency(trocoNum)} _(Levar ${formatCurrency(levarTroco)} de troco)_\n`
        } else if (changeAmount) {
          text += `💳 *Forma de Pagamento:* Dinheiro (Troco para R$ ${changeAmount})\n`
        } else {
          text += `💳 *Forma de Pagamento:* Dinheiro (Sem troco)\n`
        }
      }

      text += `━━━━━━━━━━━━━━━━━━━━━━━━\n`
      text += `_✅ Pedido gerado via Cardápio Digital Metrics_`

      const targetPhone = (profile?.whatsappNumber || '').replace(/\D/g, '')
      const url = `https://wa.me/55${targetPhone}?text=${encodeURIComponent(text)}`
      const orderData = orderApiRes?.data?.order || orderApiRes?.data;
      const newOrderId = orderData?.id || orderData?.order_id || null;
      const newDisplayId = orderData?.display_id || null;

      if (newOrderId) {
        setCreatedOrderId(newOrderId);
        if (newDisplayId) setCreatedDisplayId(newDisplayId);
        setLiveOrderStatus('pending');

        // Inscreve no FCM Push somente se a permissão foi concedida
        if (pushGranted) {
          registerPushSubscription(newOrderId);
        }
      }

      setLastOrderTotal(cartTotal);
      setLastOrderText(text);
      setCart({});
      setCheckoutWizardStep(4);
    } catch (err) {
      console.error('Erro ao enviar pedido:', err)
      alert('Ocorreu um problema ao registrar seu pedido, tente novamente.')
    } finally {
      setIsSubmittingOrder(false);
    }
  }

  
  // Inscreve o cliente no FCM Web Push para receber notificações em background.
  // IMPORTANTE: Esta função NÃO solicita permissão (isso deve ser feito antes, dentro de um user gesture).
  // Ela apenas faz o subscribe no Push Manager e registra no backend se a permissão já estiver granted.
  const registerPushSubscription = async (orderIdToSubscribe?: string) => {
    const targetId = orderIdToSubscribe || createdOrderId;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) {
      return;
    }

    try {
      // Não tenta pedir permissão aqui — isso falha fora de user gesture no Chrome Android.
      // Apenas verifica se já está granted.
      if (Notification.permission !== 'granted') {
        console.log('[Push] Permissão não concedida, pulando inscrição FCM.');
        return;
      }

      setPushNotificationEnabled(true);
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.pushManager) {
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array('BGQradO0xULQAgILyiblpRWIplGvISWCmwpeOEDmxQVicz3fg78eqkFRw-TknarkuLhLYiBq9RyL-94CPYpfb-k')
          });
        }

        if (sub && targetId) {
          await api.post('/public/orders/' + targetId + '/push-subscription', {
            subscription: sub
          });
          console.log('[Push] Inscrito no FCM com sucesso para o pedido:', targetId);
        }

        // Notificação de confirmação visual para o cliente
        showBrowserNotification('🔔 Notificações Ativadas!', {
          body: 'Você será avisado em tempo real quando seu pedido sair para entrega!',
          icon: '/favicon.svg'
        });
      }
    } catch (e) {
      console.warn('[Push] Erro no registro de push:', e);
    }
  };

  // Botão manual de ativação de notificações no Step 4 (dentro de onClick = User Gesture)
  const handleRequestPushNotification = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('Seu navegador não suporta notificações nativas.');
      return;
    }

    if (Notification.permission === 'denied') {
      playChimeAlert();
      alert('As notificações do navegador estão desativadas. Você continuará acompanhando o status do seu pedido ao vivo nesta tela e pelo WhatsApp!');
      return;
    }

    try {
      // await direto no onClick = Chrome Android DEVE exibir o prompt nativo
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setPushNotificationEnabled(true);
        await registerPushSubscription(createdOrderId || undefined);
      }
    } catch (err) {
      console.warn('Erro ao solicitar permissão de notificação:', err);
    }
  };

  // Efeito de escuta periódica do status do pedido criado (Live Tracking)
  useEffect(() => {
    if (!createdOrderId || checkoutWizardStep !== 4) return;

    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/public/orders/${createdOrderId}/status`);
        if (res.data && res.data.status) {
          const newStatus = res.data.status;
          setLiveOrderStatus((prev) => {
            if (prev !== newStatus) {
              // Dispara notificação via Service Worker nativo (seguro em Android, iOS e PC)
              const notifTag = 'order-' + (res.data.id || createdOrderId) + '-' + newStatus;
              if (newStatus === 'in_preparation') {
                showBrowserNotification(`👨‍🍳 Pedido #${res.data.display_id || ''} Confirmado!`, {
                  body: 'O restaurante aceitou seu pedido e já está preparando tudo com carinho!',
                  icon: '/favicon.svg',
                  tag: notifTag,
                });
              } else if (newStatus === 'dispatched') {
                showBrowserNotification(`🛵 Pedido #${res.data.display_id || ''} a Caminho!`, {
                  body: 'O motoboy acabou de sair com o seu pedido. Prepare-se para receber!',
                  icon: '/favicon.svg',
                  tag: notifTag,
                });
              } else if (newStatus === 'delivered') {
                const storeName = profile?.tradeName || 'Restaurante';
                const reviewUrl = (profile as any)?.googleReviewUrl || 
                  `https://www.google.com/search?q=${encodeURIComponent(storeName + ' avaliações')}`;

                showBrowserNotification('⭐ Gostou do nosso atendimento?', {
                  body: 'Faça uma avaliação e nos ajude a crescer! Toque aqui para avaliar no Google.',
                  icon: '/favicon.svg',
                  tag: notifTag,
                  data: {
                    url: reviewUrl
                  }
                });
              }
            }
            return newStatus;
          });
        }
      } catch (err) {
        console.warn('Erro ao verificar status do pedido:', err);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [createdOrderId, checkoutWizardStep]);

  const handleFinishAndReset = () => {
    setCart({})
    setIsCheckoutStepOpen(false)
    setIsCartModalOpen(false)
    setCheckoutWizardStep(1)
    setLastOrderText('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const renderCartSection = () => (
    <div className="flex h-full flex-col bg-white overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 p-5">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-black tracking-tight text-slate-900">
            Seu Pedido
          </h2>
          <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
            {cartCount} {cartCount === 1 ? 'item' : 'itens'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsCartModalOpen(false)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all"
        >
          <X className="h-4 w-4 stroke-[2.5]" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5">
        {/* BANNER DE PEDIDO MÍNIMO COM BARRA DE PROGRESSO */}
        {minOrderValue > 0 && (
          <div
            className={`mb-4 rounded-2xl border p-3.5 shadow-sm transition-all ${
              isMinOrderSatisfied
                ? 'border-emerald-200 bg-emerald-50/70'
                : 'border-amber-200 bg-amber-50/70'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold">
              <div className="flex items-center gap-1.5">
                {isMinOrderSatisfied ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="text-emerald-900">Parabéns! Pedido mínimo atingido</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span className="text-amber-900">
                      Faltam {formatCurrency(minOrderValue - cartSubtotal)} para o mínimo
                    </span>
                  </>
                )}
              </div>
              <span className="text-[11px] font-semibold text-slate-500 shrink-0">
                Mínimo: {formatCurrency(minOrderValue)}
              </span>
            </div>
            <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isMinOrderSatisfied ? 'bg-emerald-500 w-full' : 'bg-amber-500'
                }`}
                style={{
                  width: isMinOrderSatisfied
                    ? '100%'
                    : `${Math.min(100, Math.max(5, (cartSubtotal / minOrderValue) * 100))}%`,
                }}
              />
            </div>
          </div>
        )}

        {cartItems.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-slate-400">
            <ShoppingBag className="mb-3 h-14 w-14 opacity-20" />
            <p className="font-bold text-slate-600">Sua sacola está vazia.</p>
            <p className="mt-1 text-xs">Adicione deliciosos itens ao seu pedido.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {cartItems.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="flex flex-col gap-2.5 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    {item.product.imageUrl && (
                      <img
                        src={resolveImageUrl(item.product.imageUrl)}
                        alt={item.product.name}
                        className="h-16 w-16 shrink-0 rounded-xl object-cover bg-slate-100"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-extrabold text-slate-900 line-clamp-2 leading-snug">
                        {item.displayName || item.product.name}
                      </h4>
                      <p className="mt-1 text-xs font-black text-slate-900">
                        {formatCurrency(item.unitPrice * item.quantity)}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-slate-50/80 p-1">
                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(item.id)}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm transition-all hover:bg-slate-100 active:scale-95"
                      >
                        <Minus className="h-3 w-3 stroke-[2.5]" />
                      </button>
                      <span className="w-5 text-center text-xs font-black text-slate-900">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleIncrementCartItem(item.id)}
                        className="flex h-6 w-6 items-center justify-center rounded-full text-white shadow-sm transition-all active:scale-95" style={{ backgroundColor: "var(--primary-color, #10B981)" }}
                      >
                        <Plus className="h-3 w-3 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>

                  {/* Observação / Detalhe editável */}
                  <div className="flex items-center gap-2 rounded-xl bg-slate-50/80 border border-slate-200/60 px-2.5 py-1.5 focus-within:border-emerald-500 focus-within:bg-white transition-all">
                    <Pencil className="h-3 w-3 text-slate-400 shrink-0" />
                    <input
                      placeholder="Observação (ex: Sem cebola, limão, ponto...)"
                      value={item.observation || ''}
                      onChange={(e) => handleUpdateItemObs(item.id, e.target.value)}
                      className="w-full bg-transparent text-xs text-slate-700 placeholder:text-slate-400 outline-none"
                    />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* RODAPÉ DA SACOLA */}
      <div className="shrink-0 space-y-3 border-t border-slate-100 bg-white p-5">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              SUBTOTAL
            </span>
            <p className="text-[11px] text-slate-400">Taxa de entrega calculada a seguir</p>
          </div>
          <span className="text-2xl font-black text-slate-900 tracking-tight">
            {formatCurrency(cartSubtotal)}
          </span>
        </div>

        <button
          type="button"
          onClick={handleOpenCheckout}
          disabled={cartCount === 0 || !storeStatus.isOpen || !isMinOrderSatisfied}
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-black text-white shadow-lg transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50" style={{ backgroundColor: "var(--primary-color, #10B981)" }}
        >
          <span>Avançar para o Checkout</span>
          <ChevronRight className="h-4 w-4 stroke-[3]" />
        </button>
      </div>
    </div>
  )
  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-[#F8FAFC] font-sans text-slate-800 lg:flex-row">
      <main className="relative flex flex-1 flex-col overflow-x-hidden pb-24 lg:pb-0">
        <header className="relative z-10 shrink-0 bg-[#F8FAFC]">
          {/* Header Curvo Verde Floresta (Design Fiel ao Stitch) */}
          <div className="relative flex min-h-[220px] w-full flex-col justify-end overflow-hidden px-5 pt-8 pb-10 sm:pt-10 sm:pb-12 rounded-b-[36px] shadow-lg sm:min-h-[240px]" style={{ backgroundColor: "var(--primary-color, #0c3b23)" }}>
            {/* Banner de fundo se houver */}
            <DynamicHero profile={profile} />
            <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-black/85 via-black/50 to-black/20" />

            {/* Conteúdo Posicionado Sobre o Header */}
            <div className="relative z-20 flex flex-col gap-3 text-white">
              <div className="flex items-center justify-between">
                {/* Logo circular com aro dourado/sutil */}
                <div className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-full border-2 border-amber-400/90 bg-black/40 shadow-xl p-0.5">
                  {profile?.logo_url ? (
                    <img
                      src={resolveImageUrl(profile.logo_url)}
                      alt="Logo"
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <Store className="h-full w-full p-3 text-amber-400" />
                  )}
                </div>

                {/* Botão Informações no topo direito */}
                <button
                  type="button"
                  onClick={() => setIsStoreInfoOpen(true)}
                  className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3.5 py-1 text-xs font-semibold text-white/90 backdrop-blur-md transition-all hover:bg-white/25 hover:text-white"
                >
                  <Info className="h-3.5 w-3.5" /> Informações
                </button>
              </div>

              {/* Nome e Subtítulo */}
              <div className="mt-1">
                <h1 className="text-2xl font-black leading-tight tracking-tight text-white sm:text-3xl">
                  {profile?.tradeName || tenantName}
                </h1>
                <p className="mt-0.5 text-xs text-emerald-100/90 font-medium">
                  {profile?.description || profile?.subtitle || 'Culinária artesanal com ingredientes nobres'}
                </p>
              </div>

              {/* Badges de Atendimento */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {!storeStatus.isOpen ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/90 px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm backdrop-blur-md">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                    {storeStatus.reason}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#10b981] px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-white shadow-sm">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                    ABERTO AGORA
                  </span>
                )}

                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/30 px-3.5 py-1 text-[11px] font-semibold text-white/90 backdrop-blur-md">
                  <Clock className="h-3.5 w-3.5 text-emerald-300" />
                  {resolvedDeliveryTime ? (
                    <span>{resolvedDeliveryTime.min}-{resolvedDeliveryTime.max} min</span>
                  ) : deliverySectorInfo.hasSectors ? (
                    <span>A partir de {deliverySectorInfo.minFee > 0 ? (sectorsMinTime(profile) || profile.deliveryTimeMin) : profile.deliveryTimeMin} min</span>
                  ) : (
                    <span>A partir de {profile?.deliveryTimeMin || 30} min</span>
                  )}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    if (availableNeighborhoodsList.length > 0) {
                      setIsNeighborhoodPickerOpen(true)
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/30 px-3.5 py-1 text-[11px] font-semibold text-white/90 backdrop-blur-md hover:bg-black/50 transition-all cursor-pointer shadow-sm text-left"
                  title="Clique para consultar taxa do seu bairro"
                >
                  <Truck className="h-3.5 w-3.5 text-emerald-300" />
                  {neighborhood ? (
                    <span>
                      <strong className="text-white font-bold">{neighborhood}:</strong>{' '}
                      {resolvedDeliveryFee > 0 ? formatCurrency(resolvedDeliveryFee) : 'Grátis'}
                    </span>
                  ) : deliverySectorInfo.hasSectors ? (
                    <span>A partir de {formatCurrency(deliverySectorInfo.minFee)}</span>
                  ) : profile?.deliveryFee > 0 ? (
                    formatCurrency(profile.deliveryFee)
                  ) : (
                    'Entrega Grátis'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Barra de Pesquisa Flutuante */}
          <div className="-mt-6 px-4 z-20 relative max-w-2xl mx-auto">
            <div className="flex items-center gap-3 rounded-full bg-white px-5 py-3.5 shadow-xl border border-slate-100 transition-all focus-within:ring-2 focus-within:ring-[var(--primary-color,#10B981)]">
              <Search className="h-5 w-5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="O que você está desejando hoje?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm font-medium text-slate-800 placeholder-slate-400 outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Categorias Navegáveis em Pílulas (Estilo Stitch) */}
        {!searchQuery && categories.length > 0 && (
          <div className="sticky top-0 z-30 mt-3 shrink-0 border-b border-slate-100 bg-white/95 px-4 py-2.5 backdrop-blur-md">
            <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
              {categories.map((cat) => {
                const isActive = activeCategory === cat
                const label = cat === 'All' ? 'Menu Completo' : cat
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                      isActive
                        ? 'text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                    style={isActive ? { backgroundColor: 'var(--primary-color, #10B981)' } : undefined}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Listagem de Produtos */}
        <div className="flex-1 px-4 py-6 sm:px-6 lg:px-12">
          {isLoading ? (
            <div className="flex h-64 flex-col items-center justify-center space-y-4">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--primary-color,#10B981)]" />
            </div>
          ) : !products?.length ? (
            <div className="flex h-64 flex-col items-center justify-center text-center text-slate-400">
              <UtensilsCrossed className="mb-4 h-16 w-16 opacity-20" />
              <h3 className="text-lg font-bold text-slate-600">
                Nenhum produto cadastrado
              </h3>
            </div>
          ) : Object.keys(groupedProducts).length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center text-slate-400">
              <Search className="mb-4 h-12 w-12 opacity-20" />
              <p className="font-medium text-slate-600">
                Nenhum resultado para "{searchQuery}"
              </p>
            </div>
          ) : (
            <div className="space-y-10">
              {(Object.entries(groupedProducts) as [string, Product[]][]).map(
                ([catName, prods]) => (
                <section key={catName}>
                  {!searchQuery && (
                    <h2 className="mb-4 flex items-center gap-2 text-base font-extrabold tracking-tight text-slate-900">
                      {catName}
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[11px] font-extrabold text-slate-600">
                        {prods.length}
                      </span>
                    </h2>
                  )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {prods.map((product) => (
                      <div
                        key={product.id}
                        className="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-md"
                      >
                        {product.imageUrl && (
                          <div className="h-48 w-full overflow-hidden bg-slate-50 shrink-0">
                            <img
                              src={resolveImageUrl(product.imageUrl)}
                              alt={product.name}
                              onError={(e) => {
                                (e.currentTarget.parentElement as HTMLElement)?.classList.add('hidden')
                              }}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          </div>
                        )}

                        <div className="flex flex-1 flex-col p-4">
                          <h3 className="text-[15px] font-extrabold leading-snug text-slate-900">
                            {product.name}
                          </h3>
                          {product.description && (
                            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                              {product.description}
                            </p>
                          )}

                          <div className="mt-4 flex items-end justify-between gap-3 pt-2 border-t border-slate-50">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                UNITÁRIO
                              </span>
                              <p className="text-base font-black tracking-tight text-slate-900">
                                {formatCurrency(product.price)}
                              </p>
                            </div>

                            <div>
                              {(() => {
                                const isCustomizable =
                                  (product.complementGroups &&
                                    product.complementGroups.length > 0) ||
                                  Boolean(product.subcategory?.accepts_fractions)
                                const totalInCart = getProductCartCount(product.id)

                                if (isCustomizable) {
                                  return (
                                    <button
                                      type="button"
                                      onClick={() => handleProductClick(product)}
                                      className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold text-white shadow-sm transition-transform active:scale-95" style={{ backgroundColor: "var(--primary-color, #10B981)" }}
                                    >
                                      {totalInCart > 0 ? (
                                        <>
                                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px] font-black">
                                            {totalInCart}
                                          </span>
                                          Adicionar
                                        </>
                                      ) : (
                                        <>
                                          <Plus className="h-3.5 w-3.5 stroke-[3]" />
                                          Adicionar
                                        </>
                                      )}
                                    </button>
                                  )
                                }

                                if (cart[product.id]) {
                                  return (
                                    <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50/80 p-1">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveFromCart(product.id)}
                                        className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm transition-all hover:bg-slate-100 active:scale-95"
                                      >
                                        <Minus className="h-3 w-3 stroke-[3]" />
                                      </button>
                                      <span className="w-5 text-center text-xs font-black text-slate-900">
                                        {cart[product.id].quantity}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleAddToCart(product)}
                                        className="flex h-6 w-6 items-center justify-center rounded-full text-white shadow-sm transition-all active:scale-95" style={{ backgroundColor: "var(--primary-color, #10B981)" }}
                                      >
                                        <Plus className="h-3 w-3 stroke-[3]" />
                                      </button>
                                    </div>
                                  )
                                }

                                return (
                                  <button
                                    type="button"
                                    onClick={() => handleAddToCart(product)}
                                    className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold text-white shadow-sm transition-transform active:scale-95" style={{ backgroundColor: "var(--primary-color, #10B981)" }}
                                  >
                                    <Plus className="h-3.5 w-3.5 stroke-[3]" />
                                    Adicionar
                                  </button>
                                )
                              })()}
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

      {/* Sidebar Carrinho Desktop */}
      <aside className="z-30 hidden w-[400px] shrink-0 self-start border-l border-slate-200 bg-white shadow-2xl lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-hidden">
        {renderCartSection()}
      </aside>

      {/* Botão Flutuante Mobile Estilo Stitch */}
      {cartCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-md mx-auto lg:hidden">
          <motion.button
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', bounce: 0.2 }}
            onClick={() => setIsCartModalOpen(true)}
            className="flex w-full items-center justify-between rounded-2xl p-3 px-4 font-bold text-white shadow-2xl transition-transform active:scale-[0.98]" style={{ backgroundColor: "var(--primary-color, #10B981)" }}
          >
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white">
                <ShoppingBag className="h-5 w-5" />
                <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-black shadow" style={{ color: "var(--primary-color, #10B981)" }}>
                  {cartCount}
                </span>
              </div>
              <div className="text-left">
                <p className="text-sm font-black leading-tight text-white">Ver Pedido</p>
                <p className="text-[11px] font-medium text-white/80">
                  {cartCount} {cartCount === 1 ? 'item selecionado' : 'itens selecionados'}
                </p>
              </div>
            </div>
            <span className="text-base font-black tracking-tight text-white">
              {formatCurrency(cartTotal)}
            </span>
          </motion.button>
        </div>
      )}

      {/* Drawer Carrinho Mobile */}
      <AnimatePresence>
        {isCartModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartModalOpen(false)}
              className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="fixed bottom-0 left-0 right-0 z-50 flex h-[85vh] flex-col overflow-hidden rounded-t-[32px] bg-white shadow-2xl lg:hidden"
            >
              <div className="relative flex items-center justify-between border-b border-slate-100 p-6 pt-8">
                <div className="absolute left-1/2 top-3 h-1.5 w-12 -translate-x-1/2 rounded-full bg-slate-200" />
                <h2 className="text-2xl font-black tracking-tight text-slate-900">
                  Seu Pedido
                </h2>
                <button
                  onClick={() => setIsCartModalOpen(false)}
                  className="rounded-full bg-slate-100 p-2 text-slate-500 transition-colors hover:bg-slate-200"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                {renderCartSection()}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ItemCustomizerDialog
        key={customizingProduct ? customizingProduct.id : 'empty'}
        open={isCustomizerOpen}
        onOpenChange={setIsCustomizerOpen}
        product={customizingProduct}
        allProducts={products || []}
        onConfirm={handleConfirmCustomizedItem}
        primaryColor="var(--primary-color, #10B981)"
      />

      {/* Modal de Informações da Loja */}
      <Dialog open={isStoreInfoOpen} onOpenChange={setIsStoreInfoOpen}>
        <DialogContent className="sm:max-w-md !bg-white text-slate-900 border border-slate-100 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              {profile?.tradeName || tenantName}
            </DialogTitle>
            <DialogDescription>
              Informações do estabelecimento e horários de atendimento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            {profile?.street && (
              <div className="flex items-start gap-2.5 text-slate-700">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <p className="font-semibold">Endereço:</p>
                  <p>
                    {profile.street}, {profile.number} - {profile.neighborhood}
                  </p>
                  <p>
                    {profile.city} - {profile.state}{' '}
                    {profile.zipcode ? `(CEP: ${profile.zipcode})` : ''}
                  </p>
                </div>
              </div>
            )}

            {profile?.document && (
              <div className="flex items-center gap-2 text-slate-700">
                <FileText className="h-4 w-4 text-slate-400" />
                <span>CNPJ/CPF: {profile.document}</span>
              </div>
            )}

            <div className="border-t pt-3">
              <h4 className="mb-2 flex items-center gap-2 font-bold text-slate-900">
                <Clock className="h-4 w-4 text-primary" /> Horários de
                Funcionamento
              </h4>
              <div className="space-y-1.5 text-xs">
                {DAYS_OF_WEEK.map((dayName, idx) => {
                  const daySchedules = (profile?.businessHours || []).filter(
                    (b: any) => b.dayOfWeek === idx && b.isOpen,
                  )
                  return (
                    <div
                      key={dayName}
                      className="flex items-start justify-between border-b border-slate-100 py-1.5"
                    >
                      <span className="font-medium text-slate-600">
                        {dayName}
                      </span>
                      <div className="text-right">
                        {daySchedules.length > 0 ? (
                          daySchedules.map((bh: any, sIdx: number) => (
                            <div key={sIdx} className="font-bold text-emerald-600">
                              {bh.openTime} - {bh.closeTime}
                            </div>
                          ))
                        ) : (
                          <span className="text-slate-400 font-medium">Fechado</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Checkout Robusto em Etapas (Design Fiel ao Stitch) */}
      <Dialog open={isCheckoutStepOpen} onOpenChange={setIsCheckoutStepOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg !bg-white text-slate-900 border border-slate-100 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2 text-lg font-black text-slate-900">
              <span className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                Finalizar Pedido
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                Etapa {checkoutWizardStep} de 4
              </span>
            </DialogTitle>

            {/* Barra de Progresso das 4 Etapas com Rótulos */}
            <div className="pt-2">
              <div className="grid grid-cols-4 gap-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${checkoutWizardStep >= 1 ? 'bg-indigo-600' : 'bg-slate-200'}`}
                />
                <div
                  className={`h-1.5 rounded-full transition-all ${checkoutWizardStep >= 2 ? 'bg-indigo-600' : 'bg-slate-200'}`}
                />
                <div
                  className={`h-1.5 rounded-full transition-all ${checkoutWizardStep >= 3 ? 'bg-indigo-600' : 'bg-slate-200'}`}
                />
                <div
                  className={`h-1.5 rounded-full transition-all ${checkoutWizardStep >= 4 ? 'bg-indigo-600' : 'bg-slate-200'}`}
                />
              </div>
              <div className="grid grid-cols-4 text-center text-[10px] font-semibold text-slate-500 pt-1">
                <span className={checkoutWizardStep >= 1 ? 'text-indigo-600 font-bold' : ''}>Entrega</span>
                <span className={checkoutWizardStep >= 2 ? 'text-indigo-600 font-bold' : ''}>Identificação</span>
                <span className={checkoutWizardStep >= 3 ? 'text-indigo-600 font-bold' : ''}>Pagamento</span>
                <span className={checkoutWizardStep >= 4 ? 'text-indigo-600 font-bold' : ''}>Conclusão</span>
              </div>
            </div>
          </DialogHeader>

          {/* ETAPA 2: FORMA DE RECEBIMENTO, IDENTIFICAÇÃO E ENDEREÇO (STITCH) */}
          {checkoutWizardStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4 py-3 text-sm"
            >
              {/* FORMA DE RECEBIMENTO */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold uppercase tracking-wider text-slate-500">
                    FORMA DE RECEBIMENTO
                  </span>
                  <span className="text-indigo-600 font-semibold text-[11px]">
                    Toque para alternar
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* Delivery */}
                  <button
                    type="button"
                    onClick={() => setFulfillmentType('DELIVERY')}
                    className={`relative flex flex-col items-start p-3.5 rounded-2xl border-2 transition-all text-left ${
                      fulfillmentType === 'DELIVERY'
                        ? 'border-indigo-600 bg-indigo-50/20 shadow-sm ring-1 ring-indigo-600/30'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="absolute -top-2.5 left-3 rounded-full bg-indigo-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-sm">
                      MAIS ESCOLHIDO
                    </span>
                    <div className="flex items-center gap-2 mb-1 mt-1">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                        <Rocket className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-black text-slate-900">Entrega Delivery</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Receba com rapidez no seu endereço
                    </p>
                  </button>

                  {/* Retirar no Balcão */}
                  <button
                    type="button"
                    onClick={() => setFulfillmentType('TAKEOUT')}
                    className={`relative flex flex-col items-start p-3.5 rounded-2xl border-2 transition-all text-left ${
                      fulfillmentType === 'TAKEOUT'
                        ? 'border-indigo-600 bg-indigo-50/20 shadow-sm ring-1 ring-indigo-600/30'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1 mt-1">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                        <Store className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-black text-slate-900">Retirar no Balcão</span>
                    </div>
                    <p className="text-[11px] font-bold text-emerald-600 leading-tight">
                      Sem taxa de entrega
                    </p>
                  </button>
                </div>
              </div>

              {/* 1. IDENTIFICAÇÃO RÁPIDA */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-indigo-600" />
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                      1. IDENTIFICAÇÃO RÁPIDA
                    </h4>
                  </div>
                  {clientFound && (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-800">
                      <Check className="h-3 w-3 stroke-[3]" /> Cliente Reconhecido
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700">Seu WhatsApp / Telefone</label>
                  <div className="mt-1 flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
                    <span className="mr-2 flex items-center gap-1 text-xs font-bold text-slate-600 shrink-0 border-r border-slate-200 pr-2">
                      🇧🇷 +55
                    </span>
                    <input
                      type="tel"
                      placeholder="(00) 00000-0000"
                      value={customerPhone}
                      onChange={handlePhoneChange}
                      className="w-full bg-transparent text-xs font-bold text-slate-900 placeholder:text-slate-400 outline-none"
                    />
                    {isLoadingPhone && <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600 shrink-0" />}
                  </div>
                  {clientFound && customerName && (
                    <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                      <Check className="h-3 w-3 stroke-[3]" />
                      Bem-vindo de volta, <strong>{customerName}</strong>! Seus dados foram localizados.
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700">Seu Nome Completo</label>
                  <input
                    type="text"
                    placeholder="Como gostaria de ser chamado?"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* 2. ENDEREÇO DE ENTREGA (Quando for Delivery) */}
              {fulfillmentType === 'DELIVERY' && (
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-indigo-600" />
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                        2. ENDEREÇO DE ENTREGA
                      </h4>
                    </div>
                    {savedAddresses.length > 0 && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-extrabold text-slate-600">
                        {savedAddresses.length} {savedAddresses.length === 1 ? 'salvo' : 'salvos'}
                      </span>
                    )}
                  </div>

                  {/* Card de Endereço Selecionado */}
                  {savedAddresses.length > 0 && !isNewAddress ? (
                    <div className="relative rounded-xl border-2 border-indigo-200 bg-indigo-50/20 p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[9px] font-black uppercase text-indigo-800">
                          ENDEREÇO SELECIONADO
                        </span>
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                      </div>

                      <p className="text-xs font-black text-slate-900">
                        {street}, {number}
                      </p>
                      <p className="text-[11px] font-medium text-slate-600">
                        {neighborhood} • {city}/{state}
                      </p>
                      {zipcode && (
                        <p className="text-[10px] text-slate-400">CEP: {zipcode}</p>
                      )}

                      <div className="border-t border-indigo-100 pt-2 flex items-center justify-between text-xs">
                        {savedAddresses.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setIsAddressesModalOpen(true)}
                            className="flex items-center gap-1 font-bold text-indigo-700 hover:text-indigo-900"
                          >
                            <RefreshCw className="h-3 w-3" /> Trocar endereço
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setIsNewAddress(true)
                            setStreet('')
                            setNumber('')
                            setComplement('')
                            setZipcode('')
                          }}
                          className="flex items-center gap-1 font-bold text-indigo-700 hover:text-indigo-900 ml-auto"
                        >
                          <Plus className="h-3 w-3" /> Digitar outro endereço
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Formulário de Novo Endereço */
                    <div className="space-y-2.5">
                      {savedAddresses.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setIsNewAddress(false)}
                          className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                        >
                          ← Usar endereço salvo ({savedAddresses.length})
                        </button>
                      )}
                      <div>
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-slate-700">CEP (Opcional)</label>
                          {isSearchingCEPCheckout && (
                            <span className="flex items-center gap-1 text-[10px] text-primary">
                              <Loader2 className="h-3 w-3 animate-spin" /> Buscando CEP...
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder="00000-000"
                          value={zipcode}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 8)
                            setZipcode(val.length > 5 ? `${val.slice(0, 5)}-${val.slice(5)}` : val)
                            if (val.length === 8) {
                              handleSearchCEPCheckout(val)
                            }
                          }}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <label className="text-[11px] font-bold text-slate-700">Rua / Logradouro</label>
                          <input
                            type="text"
                            placeholder="Nome da rua"
                            value={street}
                            onChange={(e) => setStreet(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-700">Número</label>
                          <input
                            type="text"
                            placeholder="Nº"
                            value={number}
                            onChange={(e) => setNumber(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-bold text-slate-700">Bairro</label>
                          <input
                            type="text"
                            placeholder="Bairro"
                            value={neighborhood}
                            onChange={(e) => setNeighborhood(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-700">Complemento</label>
                          <input
                            type="text"
                            placeholder="Apto, bloco, casa 2..."
                            value={complement}
                            onChange={(e) => setComplement(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700">Ponto de Referência (Opcional)</label>
                        <input
                          type="text"
                          placeholder="Ex: Próximo à padaria, portão branco, em frente ao mercado"
                          value={referencePoint}
                          onChange={(e) => setReferencePoint(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Rodapé da Etapa 2 */}
              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Ambiente seguro • Próximo passo: Pagamento</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCheckoutStepOpen(false)
                      setIsCartModalOpen(true)
                    }}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" /> Voltar
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      if (!customerPhone.trim()) {
                        alert('Por favor, informe seu WhatsApp ou telefone.')
                        return
                      }
                      if (!customerName.trim()) {
                        alert('Por favor, informe seu nome.')
                        return
                      }
                      if (
                        fulfillmentType === 'DELIVERY' &&
                        (!street.trim() || !number.trim() || !neighborhood.trim())
                      ) {
                        alert('Por favor, informe os dados completos do endereço de entrega.')
                        return
                      }
                      if (fulfillmentType === 'DELIVERY' && deliverySectorInfo.hasSectors) {
                        const isAllowed = deliverySectorInfo.sectors.some(
                          (sec) => normalizeText(sec.neighborhood) === normalizeText(neighborhood)
                        )
                        if (!isAllowed) {
                          setUnsupportedNeighborhoodModal({
                            isOpen: true,
                            neighborhoodName: neighborhood,
                          })
                          return
                        }
                      }
                      try {
                        await registerClientInBackend()
                        setCheckoutWizardStep(3)
                      } catch (err: any) {
                        const msg = err?.response?.data?.message || 'Erro ao cadastrar cliente.'
                        if (msg.toLowerCase().includes('área de entrega') || msg.toLowerCase().includes('bairro')) {
                          setUnsupportedNeighborhoodModal({
                            isOpen: true,
                            neighborhoodName: neighborhood,
                          })
                        } else {
                          alert(msg)
                        }
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-3 text-xs font-black uppercase tracking-wider text-white shadow-md transition-all active:scale-[0.98]" style={{ backgroundColor: "var(--primary-color, #10B981)" }}
                  >
                    <span>AVANÇAR PARA PAGAMENTO</span>
                    <ChevronRight className="h-4 w-4 stroke-[3]" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ETAPA 3: FORMA DE PAGAMENTO & PIX OFICIAL (STITCH) */}
          {checkoutWizardStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4 py-3 text-sm"
            >
              {/* GRID DE FORMAS DE PAGAMENTO */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold uppercase tracking-wider text-slate-900">
                    FORMA DE PAGAMENTO
                  </span>
                  <span className="text-slate-400 text-[11px]">Escolha uma opção</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* PIX */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('PIX')}
                    className={`relative flex flex-col items-start p-3.5 rounded-2xl border-2 transition-all text-left ${
                      paymentMethod === 'PIX'
                        ? 'border-emerald-600 bg-emerald-50/40 shadow-sm ring-1 ring-emerald-600/30'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="absolute -top-2.5 right-3 rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-black uppercase text-white shadow-sm">
                      Aprovação Imediata
                    </span>
                    <div className="flex items-center gap-1.5 font-black text-xs text-slate-900 mb-0.5 mt-1">
                      <Zap className="h-4 w-4 text-amber-500 fill-amber-500" /> Pix
                    </div>
                    <p className="text-[11px] text-slate-500">Pagamento instantâneo</p>
                  </button>

                  {/* CARTÃO CRÉDITO */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CREDIT')}
                    className={`flex flex-col items-start p-3.5 rounded-2xl border-2 transition-all text-left ${
                      paymentMethod === 'CREDIT'
                        ? 'border-emerald-600 bg-emerald-50/40 shadow-sm ring-1 ring-emerald-600/30'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-black text-xs text-slate-900 mb-0.5">
                      <CreditCard className="h-4 w-4 text-indigo-600" /> Cartão Crédito
                    </div>
                    <p className="text-[11px] text-slate-500">Pague na entrega</p>
                  </button>

                  {/* CARTÃO DÉBITO */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('DEBIT')}
                    className={`flex flex-col items-start p-3.5 rounded-2xl border-2 transition-all text-left ${
                      paymentMethod === 'DEBIT'
                        ? 'border-emerald-600 bg-emerald-50/40 shadow-sm ring-1 ring-emerald-600/30'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-black text-xs text-slate-900 mb-0.5">
                      <CreditCard className="h-4 w-4 text-blue-600" /> Cartão Débito
                    </div>
                    <p className="text-[11px] text-slate-500">Maquininha na porta</p>
                  </button>

                  {/* DINHEIRO */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CASH')}
                    className={`flex flex-col items-start p-3.5 rounded-2xl border-2 transition-all text-left ${
                      paymentMethod === 'CASH'
                        ? 'border-emerald-600 bg-emerald-50/40 shadow-sm ring-1 ring-emerald-600/30'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-black text-xs text-slate-900 mb-0.5">
                      <Banknote className="h-4 w-4 text-emerald-600" /> Dinheiro
                    </div>
                    <p className="text-[11px] text-slate-500">Com opção de troco</p>
                  </button>
                </div>

                {/* VALE REFEIÇÃO (Full width) */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('DEBIT')}
                  className="w-full flex items-center justify-between p-3 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all text-left"
                >
                  <div className="flex items-center gap-2">
                    <Ticket className="h-4 w-4 text-amber-600" />
                    <span className="text-xs font-black text-slate-900">Vale Refeição</span>
                    <span className="text-[11px] text-slate-500">(VR, Sodexo, Alelo)</span>
                  </div>
                </button>
              </div>

              {/* DETALHES DO PIX OFICIAL */}
              {(paymentMethod === 'PIX' || fulfillmentType === 'TAKEOUT') && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-950">
                      <QrCode className="h-4 w-4 text-emerald-600" />
                      <span>QR Code Pix & Copia e Cola Oficial</span>
                    </div>
                    <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-xs font-black text-emerald-800">
                      {formatCurrency(cartTotal)}
                    </span>
                  </div>

                  {/* QR CODE OFICIAL */}
                  {pixBRCodePayload && (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(pixBRCodePayload)}`}
                        alt="QR Code Pix"
                        className="h-44 w-44 object-contain"
                      />
                      <p className="mt-2 text-center text-xs font-medium text-slate-600">
                        Abra o app do seu banco e escaneie o QR Code acima
                      </p>
                    </div>
                  )}

                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Ou copie o código <strong>Pix Copia e Cola</strong> abaixo. O valor exato de{' '}
                    <strong className="text-emerald-800">{formatCurrency(cartTotal)}</strong> será preenchido automaticamente!
                  </p>

                  <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-white p-2 shadow-sm">
                    <span className="flex-1 truncate font-mono text-[11px] text-slate-700 px-1">
                      {pixBRCodePayload || profile?.pixKey || profile?.whatsappNumber || 'Contate a loja'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyPixKey(pixBRCodePayload || profile?.pixKey || profile?.whatsappNumber || '')}
                      className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition-all shrink-0" style={{ backgroundColor: "var(--primary-color, #10B981)" }}
                    >
                      {isCopiedPix ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {isCopiedPix ? 'Copiado!' : 'Copiar Pix'}
                    </button>
                  </div>

                  {/* TIMER DE VALIDADE */}
                  <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium pt-1">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      Código válido por <strong className="text-slate-800 font-bold">{formatCountdown(pixTimerSeconds)}</strong>
                    </span>
                  </div>
                </div>
              )}

              {/* TROCO EM DINHEIRO */}
              {paymentMethod === 'CASH' && fulfillmentType === 'DELIVERY' && (
                <div className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">Precisa de troco para quanto?</label>
                  <input
                    type="text"
                    placeholder="Ex: 50,00 (deixe em branco se não precisar)"
                    value={changeAmount}
                    onChange={(e) => setChangeAmount(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium text-slate-900"
                  />
                </div>
              )}

              {/* RESUMO DOS VALORES */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Subtotal dos itens</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(cartSubtotal)}</span>
                </div>
                {fulfillmentType === 'DELIVERY' && (
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>Taxa de Entrega</span>
                    <span className="font-semibold text-slate-900">
                      {deliveryFee > 0 ? formatCurrency(deliveryFee) : 'Grátis'}
                    </span>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-2 flex items-center justify-between">
                  <span className="text-sm font-black text-slate-900">Total a Pagar</span>
                  <span className="text-xl font-black text-emerald-700">{formatCurrency(cartTotal)}</span>
                </div>
              </div>

              {/* AÇÕES DA ETAPA 3 */}
              <div className="pt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCheckoutWizardStep(2)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" /> Voltar
                  </button>

                  <button
                    type="button"
                    disabled={isSubmittingOrder}
                    onClick={handleFinalizeOrder}
                    className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-3.5 text-xs font-black text-white shadow-lg transition-all active:scale-[0.98] disabled:opacity-50" style={{ backgroundColor: "var(--primary-color, #10B981)" }}
                  >
                    {isSubmittingOrder ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <span>Confirmar e Enviar Pedido via WhatsApp</span>
                        <span>🚀</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Ambiente seguro e autenticado</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* PASSO 4: Sucesso e Parabéns pelo Pedido */}
          {checkoutWizardStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center py-4 text-center"
            >
              <div className="relative mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-inner">
                <CheckCircle2 className="h-12 w-12 text-emerald-600" />
              </div>

              <h3 className="text-2xl font-black tracking-tight text-slate-900">
                Parabéns pelo seu Pedido! 🎉
              </h3>
              <p className="mt-1 max-w-md text-xs font-medium text-slate-600">
                Seu pedido foi registrado com sucesso! Acompanhe o status ao vivo:
              </p>

              {/* CARD DE STATUS EM TEMPO REAL (LIVE TRACKER) */}
              <div className="mt-4 w-full overflow-hidden rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-md text-left">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Acompanhamento do Pedido #{createdDisplayId || ''}
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Tempo Real
                  </span>
                </div>

                <div className="mt-3">
                  {liveOrderStatus === 'pending' && (
                    <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-3 text-amber-900 border border-amber-200/60">
                      <Clock className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold">🟡 Aguardando Confirmação do Restaurante</p>
                        <p className="text-xs text-amber-800/80 mt-0.5">
                          O restaurante recebeu seu pedido e está validando para iniciar o preparo.
                        </p>
                      </div>
                    </div>
                  )}

                  {liveOrderStatus === 'in_preparation' && (
                    <div className="flex items-start gap-3 rounded-xl bg-orange-50 p-3 text-orange-900 border border-orange-200/60 animate-fade-in">
                      <ChefHat className="h-5 w-5 shrink-0 text-orange-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold">👨‍🍳 Pedido Confirmado! Em Preparo</p>
                        <p className="text-xs text-orange-800/80 mt-0.5">
                          Nossa cozinha já está preparando seus pratos com todo o carinho.
                        </p>
                      </div>
                    </div>
                  )}

                  {liveOrderStatus === 'dispatched' && (
                    <div className="flex items-start gap-3 rounded-xl bg-blue-50 p-3 text-blue-900 border border-blue-200/60 animate-fade-in">
                      <Bike className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold">🛵 Pedido a Caminho!</p>
                        <p className="text-xs text-blue-800/80 mt-0.5">
                          O motoboy já retirou seu pedido e está a caminho do seu endereço.
                        </p>
                      </div>
                    </div>
                  )}

                  {liveOrderStatus === 'delivered' && (
                    <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-3 text-amber-950 border border-amber-200/70 animate-fade-in">
                      <span className="text-xl shrink-0 mt-0.5">⭐</span>
                      <div className="flex-1">
                        <p className="text-sm font-black text-amber-950">Gostou do nosso atendimento?</p>
                        <p className="text-xs text-amber-900/90 mt-0.5">
                          Faça uma avaliação e nos ajude a crescer! Sua opinião é fundamental.
                        </p>
                        {(() => {
                          const reviewUrl = (profile as any)?.googleReviewUrl || 
                            `https://www.google.com/search?q=${encodeURIComponent(((profile?.tradeName || 'Restaurante') + ' avaliações'))}`;
                          return (
                            <a
                              href={reviewUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2.5 flex items-center justify-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs py-2.5 px-3 shadow transition-all active:scale-98"
                            >
                              <span>⭐ Deixar Avaliação no Google ⭐</span>
                            </a>
                          )
                        })()}
                      </div>
                    </div>
                  )}
                </div>

                {/* Status da Notificação Push no Celular: Selo de Sucesso ou Botão Único */}
                {(pushNotificationEnabled || (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted')) ? (
                  <div className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/90 py-2.5 px-3 text-xs font-bold text-emerald-800">
                    <span className="text-sm">🔔</span>
                    <span>Avisos no celular ativados para este pedido</span>
                  </div>
                ) : (
                  typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'denied' && (
                    <button
                      type="button"
                      onClick={handleRequestPushNotification}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-xs font-bold text-white shadow transition-transform active:scale-98 hover:bg-slate-800"
                    >
                      <Bell className="h-4 w-4 text-amber-400" />
                      <span>Avisar no meu celular quando o motoboy sair 🔔</span>
                    </button>
                  )
                )}
              </div>

              {/* Resumo do Pedido Confirmado */}
              <div className="mt-5 w-full space-y-2.5 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-left">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Cliente:</span>
                  <span className="font-bold text-slate-900">{customerName}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>WhatsApp:</span>
                  <span className="font-bold text-slate-900">{customerPhone}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Modalidade:</span>
                  <span className="font-bold text-slate-900">
                    {fulfillmentType === 'DELIVERY' ? '🛵 Entrega (Delivery)' : '🥡 Retirada no Balcão'}
                  </span>
                </div>
                {fulfillmentType === 'DELIVERY' && (
                  <div className="flex items-start justify-between text-xs text-slate-600">
                    <span>Endereço:</span>
                    <span className="font-bold text-slate-900 text-right max-w-[240px]">
                      {street}, {number}{complement ? ` (${complement})` : ''} - {neighborhood}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Forma de Pagamento:</span>
                  <span className="font-bold text-slate-900">
                    {paymentMethod === 'PIX'
                      ? '⚡ Pix'
                      : paymentMethod === 'CREDIT'
                        ? '💳 Cartão de Crédito'
                        : paymentMethod === 'DEBIT'
                          ? '💳 Cartão de Débito'
                          : '💵 Dinheiro'}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-sm">
                  <span className="font-bold text-slate-800">Total:</span>
                  <span className="text-base font-black text-emerald-600">
                    {formatCurrency(lastOrderTotal || cartTotal)}
                  </span>
                </div>
              </div>

              {/* Botão Principal de Envio no WhatsApp */}
              {lastOrderText && (
                <div className="mt-4 w-full">
                  <button
                    type="button"
                    onClick={() => {
                      const targetPhone = (profile?.whatsappNumber || '').replace(/\D/g, '')
                      const url = `https://wa.me/55${targetPhone}?text=${encodeURIComponent(lastOrderText)}`
                      window.open(url, '_blank')
                    }}
                    className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-emerald-600 py-3.5 text-sm font-extrabold text-white shadow-lg transition-transform active:scale-98 hover:bg-emerald-700"
                  >
                    <span>Enviar Cópia no WhatsApp</span>
                    <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">💬</span>
                  </button>
                </div>
              )}

              {/* Botão de Concluir */}
              <button
                type="button"
                onClick={handleFinishAndReset}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-black text-white shadow-xl transition-all hover:opacity-95 active:scale-[0.98]"
                style={{ backgroundColor: 'var(--primary-color, #10B981)' }}
              >
                OK, Voltar ao Cardápio ✨
              </button>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Dialog: Escolha Rápida de Bairro no Topo */}
      <Dialog open={isNeighborhoodPickerOpen} onOpenChange={setIsNeighborhoodPickerOpen}>
        <DialogContent className="rounded-3xl p-6 sm:max-w-md !bg-white text-slate-900 border border-slate-100 shadow-2xl">
          <DialogHeader className="space-y-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
              <MapPin className="h-6 w-6" />
            </div>
            <DialogTitle className="text-lg font-black text-slate-900 leading-tight">
              Selecione seu bairro para entrega 🛵
            </DialogTitle>
            <DialogDescription className="text-xs font-medium text-slate-600">
              Escolha seu bairro para calcularmos a taxa e o tempo exatos de entrega.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 pt-2">
            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {availableNeighborhoodsList.map((bairro) => (
                <button
                  key={bairro}
                  type="button"
                  onClick={() => {
                    setNeighborhood(bairro)
                    setIsNeighborhoodPickerOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-xl px-4 py-3 text-xs font-bold text-left transition-all border cursor-pointer',
                    neighborhood === bairro
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800'
                  )}
                >
                  <span>{bairro}</span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsNeighborhoodPickerOpen(false)}
              className="w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-700 pt-2"
            >
              Fechar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Dialog: Bairro Fora da Rota Padrão com Opção Acolhedora de Bairro de Referência */}
      <Dialog
        open={!!unsupportedNeighborhoodModal?.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setUnsupportedNeighborhoodModal(null)
            setSelectedReferenceNeighbor('')
          }
        }}
      >
        <DialogContent className="rounded-3xl p-6 sm:max-w-md !bg-white text-slate-900 border border-slate-100 shadow-2xl">
          <DialogHeader className="text-center sm:text-left space-y-2">
            <div className="mx-auto sm:mx-0 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
              <Bike className="h-6 w-6" />
            </div>
            <DialogTitle className="text-lg font-black text-slate-900 leading-tight">
              Localizamos seu endereço! 🛵
            </DialogTitle>
            <DialogDescription className="text-xs font-medium text-slate-600 leading-relaxed">
              O bairro{' '}
              <strong className="text-slate-900 font-bold">
                "{unsupportedNeighborhoodModal?.neighborhoodName || 'informado'}"
              </strong>{' '}
              não está em nossa lista automática de rotas rápidas, mas nós podemos entregar para você!
            </DialogDescription>
          </DialogHeader>

          {/* Opção Amigável: Selecionar Bairro Vizinho de Referência */}
          {availableNeighborhoodsList.length > 0 && (
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/80 p-4 text-xs text-indigo-950 space-y-2.5">
              <p className="font-bold flex items-center gap-1.5 text-indigo-900">
                <span>📍</span> Escolha o bairro atendido mais próximo de você:
              </p>
              <select
                value={selectedReferenceNeighbor}
                onChange={(e) => setSelectedReferenceNeighbor(e.target.value)}
                className="w-full rounded-xl border border-indigo-300 bg-white px-3 py-2.5 text-xs font-semibold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">-- Selecione o bairro vizinho mais perto --</option>
                {availableNeighborhoodsList.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-indigo-800 leading-relaxed">
                ℹ️ Usaremos esse bairro vizinho como base para a rota e taxa. Sua entrega será confirmada pela nossa equipe logo após o envio do pedido.
              </p>
              <button
                type="button"
                disabled={!selectedReferenceNeighbor}
                onClick={() => {
                  const orig = unsupportedNeighborhoodModal?.neighborhoodName || ''
                  setNeighborhood(selectedReferenceNeighbor)
                  setCustomReferenceNote(`Bairro original informado: ${orig} (Bairro de referência utilizado: ${selectedReferenceNeighbor} - sujeito a confirmação de entrega)`)
                  setUnsupportedNeighborhoodModal(null)
                  setSelectedReferenceNeighbor('')
                  setTimeout(() => {
                    document.getElementById('number-input')?.focus()
                  }, 150)
                }}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-bold text-white shadow-md transition-all',
                  selectedReferenceNeighbor
                    ? 'bg-primary hover:bg-primary/90 cursor-pointer'
                    : 'bg-slate-300 cursor-not-allowed opacity-60'
                )}
              >
                <CheckCircle2 className="h-4 w-4" />
                Continuar Pedido com Bairro de Referência
              </button>
            </div>
          )}

          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={() => {
                const storePhone = (profile?.whatsappNumber || '').replace(/\D/g, '')
                const clientText = `Olá! Estou montando um pedido no cardápio online e gostaria de saber se vocês conseguem entregar no bairro ${unsupportedNeighborhoodModal?.neighborhoodName || ''}?`
                const link = `https://wa.me/55${storePhone}?text=${encodeURIComponent(clientText)}`
                window.open(link, '_blank')
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              <MessageCircle className="h-4 w-4" />
              Tirar dúvida no WhatsApp da loja
            </button>

            <button
              type="button"
              onClick={() => {
                setFulfillmentType('TAKEOUT')
                setUnsupportedNeighborhoodModal(null)
                setNeighborhood('Balcão')
                setStreet('Retirada no Balcão')
                setNumber('0')
                setComplement('')
                setZipcode('')
                setCheckoutWizardStep(3)
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Store className="h-4 w-4 text-primary" />
              Prefiro Retirar no Balcão
            </button>

            <button
              type="button"
              onClick={() => {
                setUnsupportedNeighborhoodModal(null)
                setNeighborhood('')
                setSelectedReferenceNeighbor('')
                setTimeout(() => {
                  document.getElementById('neighborhood')?.focus()
                }, 150)
              }}
              className="w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-700 pt-1 cursor-pointer"
            >
              Voltar e escolher outro endereço
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Dialog de Meus Endereços Cadastrados (Padrão Marujo) */}
      <Dialog
        open={isAddressesModalOpen}
        onOpenChange={setIsAddressesModalOpen}
      >
        <DialogContent className="rounded-3xl p-6 sm:max-w-md !bg-white text-slate-900 border border-slate-100 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <MapPin className="h-5 w-5 text-primary" /> Meus Endereços
              Cadastrados
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Selecione em qual endereço deseja receber seu pedido:
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] space-y-2.5 overflow-y-auto py-2 pr-1">
            {savedAddresses.map((addr, index) => {
              const isSelected =
                addressReadonly &&
                street === addr.street &&
                number === addr.number?.toString()
              return (
                <div
                  key={index}
                  onClick={() => handleSelectSavedAddress(addr)}
                  className={`flex cursor-pointer items-start justify-between gap-3 rounded-2xl border-2 p-3.5 transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-900">
                        {addr.street}, {addr.number}
                      </p>
                      {addr.is_main && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black uppercase text-primary">
                          Principal
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-slate-600">
                      {addr.neighborhood} - {addr.city}/{addr.state}
                    </p>
                    {addr.zipcode && (
                      <p className="text-[11px] text-slate-400">
                        CEP:{' '}
                        {formatCep(addr.zipcode.toString().padStart(8, '0'))}
                      </p>
                    )}
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  )}
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-between border-t pt-2">
            <button
              type="button"
              onClick={() => {
                handleNewAddress()
                setIsAddressesModalOpen(false)
              }}
              className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
            >
              <Plus className="h-4 w-4" /> Cadastrar novo endereço
            </button>
            <button
              type="button"
              onClick={() => setIsAddressesModalOpen(false)}
              className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
            >
              Fechar
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
