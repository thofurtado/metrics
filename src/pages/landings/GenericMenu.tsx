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
  Compass,
  Flame,
  Navigation,
  Crosshair,
  Banknote,
  Bell,
  Bike,
  Check,
  CheckCircle2,
  ChefHat,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  CreditCard,
  FileText,
  Home,
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
} from 'lucide-react'
import QRCode from 'qrcode'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'

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
import { applyMenuTheme, resolveMenuTheme } from './menu-themes'
import { CheckoutAddressMap } from '@/components/maps/CheckoutAddressMap'


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

// Níveis de tamanho do texto do cardápio (multiplicam a escala fluida definida em index.css)
const MENU_TEXT_SCALES = [1, 1.15, 1.3]

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


function getProductMetaLabel(product: Product) {
  const combined = (product.name + ' ' + (product.description || '')).toUpperCase()
  const volumeMatch = combined.match(/\b(\d+\s*(?:ML|L|G|KG))\b/i)
  const vol = volumeMatch ? volumeMatch[1].replace(/\s+/g, '') : ''
  const unit = formatMeasureUnit(product.measureUnit).toUpperCase() || 'UNITÁRIO'
  if (vol && !unit.includes(vol)) {
    return `${unit} • ${vol}`
  }
  return unit
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
  const themeColor = profile?.primary_color || profile?.primaryColor || '#DC2626'

  useEffect(() => {
    const root = document.documentElement
    const hadDark = root.classList.contains('dark')
    root.classList.remove('dark')
    root.classList.add('light')

    if (themeColor) {
      root.style.setProperty('--primary-color', themeColor)
    }

    return () => {
      if (hadDark) {
        root.classList.add('dark')
        root.classList.remove('light')
      }
    }
  }, [themeColor])

  // Tema premium (paleta + fontes) do cliente, quando configurado; sem tema o visual padrão permanece
  const menuTheme = useMemo(() => resolveMenuTheme(profile), [profile])
  useEffect(() => {
    if (!menuTheme) return
    return applyMenuTheme(menuTheme)
  }, [menuTheme])

  const [cart, setCart] = useState<Record<string, CartItem>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [customizingProduct, setCustomizingProduct] = useState<ProductItem | null>(null)
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [isCartModalOpen, setIsCartModalOpen] = useState(false)
  const [isStoreInfoOpen, setIsStoreInfoOpen] = useState(false)

  // Acessibilidade: tamanho do texto do cardápio (3 níveis), lembrado no aparelho do cliente
  const [textLevel, setTextLevel] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem('menu_text_level'))
      return saved >= 0 && saved < MENU_TEXT_SCALES.length ? saved : 0
    } catch {
      return 0
    }
  })
  useEffect(() => {
    const root = document.documentElement
    root.classList.add('menu-fluid')
    root.style.setProperty('--menu-text-scale', String(MENU_TEXT_SCALES[textLevel]))
    try {
      localStorage.setItem('menu_text_level', String(textLevel))
    } catch {
      /* sem armazenamento: apenas não lembra a preferência */
    }
    return () => {
      root.classList.remove('menu-fluid')
      root.style.removeProperty('--menu-text-scale')
    }
  }, [textLevel])

  // Estados do Modal de Checkout Robusto (iFood / Anota AI / Marujo Standard)
  const [isCheckoutStepOpen, setIsCheckoutStepOpen] = useState(false)
  const [checkoutWizardStep, setCheckoutWizardStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1)
  const [lastOrderText, setLastOrderText] = useState('')
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null)
  const [lastOrderTotal, setLastOrderTotal] = useState<number>(0)
  const [lastOrderItemsSummary, setLastOrderItemsSummary] = useState<string>('')
  const [lastOrderItemsCount, setLastOrderItemsCount] = useState<number>(1)
  const [lastOrderItems, setLastOrderItems] = useState<CartItem[]>([])
  const [isOrderItemsOpen, setIsOrderItemsOpen] = useState(false)
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
    'PIX' | 'CREDIT' | 'DEBIT' | 'CASH' | 'VOUCHER' | string
  >('PIX')

  // Chave Pix da loja (configurada no White Label; usa o WhatsApp da loja se não houver chave)
  const pixKeyResolved: string = profile?.pixKey || profile?.whatsappNumber || ''

  // Mapeamento dinâmico das formas de pagamento ativas da loja (vindas do perfil público da empresa)
  const availablePaymentMethods = useMemo(() => {
    const methods = profile?.paymentMethods
    if (Array.isArray(methods)) {
      const hasPix = methods.some((p: any) => (p.name || '').toLowerCase().includes('pix'))
      const hasCredit = methods.some((p: any) => {
        const n = (p.name || '').toLowerCase()
        return n.includes('crédito') || n.includes('credito')
      })
      const hasDebit = methods.some((p: any) => {
        const n = (p.name || '').toLowerCase()
        return n.includes('débito') || n.includes('debito')
      })
      const hasCash = methods.some((p: any) => (p.name || '').toLowerCase().includes('dinheiro') || (p.name || '').toLowerCase().includes('cash'))
      const voucherItem = methods.find((p: any) => {
        const n = (p.name || '').toLowerCase()
        return (
          n.includes('vale') ||
          n.includes('voucher') ||
          n.includes('refei') ||
          n.includes('ticket') ||
          n.includes('sodexo') ||
          n.includes('alelo') ||
          n.includes('vr') ||
          n.includes('ben') ||
          n.includes('pluxee')
        )
      })

      const isKnown = (name: string) => {
        const n = (name || '').toLowerCase()
        return (
          n.includes('pix') ||
          n.includes('crédito') ||
          n.includes('credito') ||
          n.includes('débito') ||
          n.includes('debito') ||
          n.includes('dinheiro') ||
          n.includes('cash') ||
          n.includes('vale') ||
          n.includes('voucher') ||
          n.includes('refei') ||
          n.includes('ticket') ||
          n.includes('sodexo') ||
          n.includes('alelo') ||
          n.includes('vr') ||
          n.includes('ben') ||
          n.includes('pluxee')
        )
      }

      const extraMethods = methods.filter((p: any) => !isKnown(p.name))

      return {
        hasCustomConfig: true,
        pix: hasPix && !!pixKeyResolved,
        credit: hasCredit,
        debit: hasDebit,
        cash: hasCash,
        voucher: !!voucherItem,
        voucherName: voucherItem?.name || 'Vale Refeição (VR, Sodexo, Alelo)',
        extraMethods,
        methodsList: methods,
      }
    }

    return {
      hasCustomConfig: false,
      pix: !!pixKeyResolved,
      credit: true,
      debit: true,
      cash: true,
      voucher: false, // Se a loja não configurou voucher, NUNCA exibe!
      voucherName: 'Vale Refeição (VR, Sodexo, Alelo)',
      extraMethods: [],
      methodsList: [],
    }
  }, [profile?.paymentMethods, pixKeyResolved])

  // Garante que o método selecionado seja sempre um dos permitidos e ativos da loja
  useEffect(() => {
    if (!availablePaymentMethods) return
    const isCurrentValid =
      (paymentMethod === 'PIX' && availablePaymentMethods.pix) ||
      (paymentMethod === 'CREDIT' && availablePaymentMethods.credit) ||
      (paymentMethod === 'DEBIT' && availablePaymentMethods.debit) ||
      (paymentMethod === 'CASH' && availablePaymentMethods.cash) ||
      (paymentMethod === 'VOUCHER' && availablePaymentMethods.voucher) ||
      (availablePaymentMethods.extraMethods?.some((m: any) => m.name === paymentMethod))

    if (!isCurrentValid) {
      if (availablePaymentMethods.pix) setPaymentMethod('PIX')
      else if (availablePaymentMethods.credit) setPaymentMethod('CREDIT')
      else if (availablePaymentMethods.debit) setPaymentMethod('DEBIT')
      else if (availablePaymentMethods.cash) setPaymentMethod('CASH')
      else if (availablePaymentMethods.voucher) setPaymentMethod('VOUCHER')
      else if (availablePaymentMethods.extraMethods && availablePaymentMethods.extraMethods.length > 0) {
        setPaymentMethod(availablePaymentMethods.extraMethods[0].name)
      }
    }
  }, [availablePaymentMethods, paymentMethod])
  const payAt = fulfillmentType === 'TAKEOUT' ? 'na Retirada' : 'na Entrega'
  const paymentOptions: {
    value: string
    title: string
    desc: string
    Icon: typeof QrCode
    tint: string
  }[] = [
    availablePaymentMethods.pix && {
      value: 'PIX',
      title: 'Pix',
      desc: 'QR Code ou copia e cola',
      Icon: QrCode,
      tint: 'bg-emerald-100 text-emerald-700',
    },
    availablePaymentMethods.credit && {
      value: 'CREDIT',
      title: `Crédito ${payAt}`,
      desc: fulfillmentType === 'TAKEOUT' ? 'Na maquininha do balcão' : 'Levamos a maquininha',
      Icon: CreditCard,
      tint: 'bg-slate-100 text-slate-700',
    },
    availablePaymentMethods.debit && {
      value: 'DEBIT',
      title: `Débito ${payAt}`,
      desc: fulfillmentType === 'TAKEOUT' ? 'Na maquininha do balcão' : 'Levamos a maquininha',
      Icon: CreditCard,
      tint: 'bg-slate-100 text-slate-700',
    },
    availablePaymentMethods.cash && {
      value: 'CASH',
      title: 'Dinheiro',
      desc: fulfillmentType === 'TAKEOUT' ? 'Pague no balcão' : 'Com ou sem troco',
      Icon: Banknote,
      tint: 'bg-slate-100 text-slate-700',
    },
    availablePaymentMethods.voucher && {
      value: 'VOUCHER',
      title: availablePaymentMethods.voucherName || 'Vale Refeição',
      desc: `Na maquininha ${payAt.toLowerCase()}`,
      Icon: Ticket,
      tint: 'bg-amber-100 text-amber-700',
    },
    ...(availablePaymentMethods.extraMethods || []).map((m: any) => ({
      value: m.name as string,
      title: m.name as string,
      desc: `Pague ${payAt.toLowerCase()}`,
      Icon: CreditCard,
      tint: 'bg-slate-100 text-slate-700',
    })),
  ].filter(Boolean) as any

  const [changeAmount, setChangeAmount] = useState('')
  const [isSearchingCEPCheckout, setIsSearchingCEPCheckout] = useState(false)
  const [isCopiedPix, setIsCopiedPix] = useState(false)
  const [pixQrDataUrl, setPixQrDataUrl] = useState('')
  const [isManualAddressMode, setIsManualAddressMode] = useState(false)
  const [isNeighborhoodHelpOpen, setIsNeighborhoodHelpOpen] = useState(false)


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
  // Política STRICT: bairro informado que a loja não atende (nome, ou '' se desconhecido)
  const [unservedNeighborhood, setUnservedNeighborhood] = useState<string | null>(null)
  const [isNeighborhoodPickerOpen, setIsNeighborhoodPickerOpen] = useState(false)
  const [selectedReferenceNeighbor, setSelectedReferenceNeighbor] = useState('')
  const [deliveryCoords, setDeliveryCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [gpsTriggerNonce, setGpsTriggerNonce] = useState(0)

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
    // Celulares no Brasil possuem 11 dígitos com 9 no terceiro dígito (ex: 12992193644).
    // Telefones fixos possuem 10 dígitos (ex: 1239213644).
    const isMobileComplete = raw.length === 11
    const isLandlineComplete = raw.length === 10 && raw[2] !== '9'
    if (isMobileComplete || isLandlineComplete) {
      handlePhoneSearch(raw)
    }
  }

  // Etapa 2 (identificação): telefone completo -> busca cadastro; sem cadastro -> pede só o nome
  const phoneInputRef = useRef<HTMLInputElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const rawPhoneDigits = customerPhone.replace(/\D/g, '')
  const phoneReady =
    rawPhoneDigits.length === 11 || (rawPhoneDigits.length === 10 && rawPhoneDigits[2] !== '9')
  const showNameField = phoneReady && !isLoadingPhone && !clientFound
  const canAdvanceIdentification =
    phoneReady && !isLoadingPhone && customerName.trim().length > 1

  const handleAdvanceIdentification = () => {
    if (!canAdvanceIdentification) return
    // Balcão pula direto para pagamento; delivery vai para endereço
    setCheckoutWizardStep(fulfillmentType === 'TAKEOUT' ? 5 : 3)
  }

  useEffect(() => {
    if (!isCheckoutStepOpen || checkoutWizardStep !== 2) return
    const t = setTimeout(() => {
      if (showNameField && !customerName.trim()) nameInputRef.current?.focus()
      else if (!phoneReady) phoneInputRef.current?.focus()
    }, 150)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCheckoutStepOpen, checkoutWizardStep, showNameField, phoneReady])

  // Etapa 3 (endereço): com cadastro -> escolhe entre salvos; sem cadastro -> CEP + formulário
  const [wantsNewAddress, setWantsNewAddress] = useState(false)
  const cepInputRef = useRef<HTMLInputElement>(null)
  const showSavedAddressList = savedAddresses.length > 0 && !wantsNewAddress
  const zipDigits = zipcode.replace(/\D/g, '')
  const showAddressFields =
    isManualAddressMode || !!street.trim() || (zipDigits.length === 8 && !isSearchingCEPCheckout)
  const isAddressValid =
    !!street.trim() &&
    !!number.trim() &&
    number.trim() !== '0' &&
    !/^s\/?n$/i.test(number.trim()) &&
    !!neighborhood.trim()
  const addrLabelCls = 'block pb-1.5 text-sm font-bold text-slate-700'
  const addrInputCls =
    'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500'

  const selectSavedAddress = (addr: any) => {
    setStreet(addr.street || '')
    setNumber(addr.number ? String(addr.number) : '')
    setComplement(addr.complement || '')
    setReferencePoint(addr.referencePoint || addr.reference_point || '')
    setCity(addr.city || '')
    setState(addr.state || '')
    setZipcode(addr.zipcode ? formatCep(addr.zipcode.toString().padStart(8, '0')) : '')
    setIsNewAddress(false)
    setUnservedNeighborhood(null)
    const matched = matchNeighborhoodWithConfig(addr.neighborhood || '')
    if (matched) {
      setNeighborhood(matched)
      setAddressReadonly(true)
    } else if (isStrictNeighborhoods && availableNeighborhoodsList.length > 0) {
      setNeighborhood('')
      setAddressReadonly(false)
      setUnservedNeighborhood(addr.neighborhood || '')
    } else {
      setNeighborhood(addr.neighborhood || '')
      setAddressReadonly(true)
    }
  }

  const startNewAddress = () => {
    setWantsNewAddress(true)
    setIsNewAddress(true)
    setAddressReadonly(false)
    setUnservedNeighborhood(null)
    setIsManualAddressMode(false)
    setZipcode('')
    setStreet('')
    setNumber('')
    setComplement('')
    setNeighborhood('')
    setReferencePoint('')
    setCity('')
    setState('')
  }

  // Bairro que a loja não atende (STRICT): oferece retirada no balcão
  const switchToTakeout = () => {
    setUnservedNeighborhood(null)
    setFulfillmentType('TAKEOUT')
    setNeighborhood('Balcão')
    setStreet('Retirada no Balcão')
    setNumber('0')
    setComplement('')
    setZipcode('')
    setCheckoutWizardStep(5)
  }

  const backToSavedAddresses = () => {
    setWantsNewAddress(false)
    if (savedAddresses[0]) selectSavedAddress(savedAddresses[0])
  }

  useEffect(() => {
    if (!isCheckoutStepOpen || checkoutWizardStep !== 3 || showSavedAddressList) return
    if (street.trim()) return
    const t = setTimeout(() => cepInputRef.current?.focus(), 150)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCheckoutStepOpen, checkoutWizardStep, showSavedAddressList])

  const handlePhoneSearch = async (overrideRawPhone?: string) => {
    const rawPhone = (overrideRawPhone || customerPhone).replace(/\D/g, '')
    if (rawPhone.length < 10) return

    setIsLoadingPhone(true)
    setPhoneSearchToast(null)
    setWantsNewAddress(false)

    try {
      const res = await api.get(`/public/clients/phone/${rawPhone}`)
      if (res.data && res.data.client) {
        const client = res.data.client
        setCustomerName(client.name || '')
        setClientFound(true)

        // Filtra endereços fictícios de retirada
        const validAddresses = (client.addresses || []).filter((a: any) =>
          !a.street?.toLowerCase().includes('retirada') &&
          !a.neighborhood?.toLowerCase().includes('balcão')
        )
        setSavedAddresses(validAddresses)

        // Se for RETIRADA, NUNCA preenche nem exige endereço
        if (fulfillmentType === 'TAKEOUT') {
          setZipcode('')
          setStreet('')
          setNumber('')
          setNeighborhood('')
          setCity('')
          setState('')
          setAddressReadonly(false)
          setIsNewAddress(false)
        } else if (validAddresses.length > 0) {
          const addr = validAddresses[0]
          setZipcode(
            addr.zipcode
              ? formatCep(addr.zipcode.toString().padStart(8, '0'))
              : '',
          )
          setStreet(addr.street || '')
          setNumber(addr.number ? addr.number.toString() : '')
          setCity(addr.city || '')
          setState(addr.state || '')

          // Sincroniza bairro com deliverySectors da empresa
          const matchedNeighborhood = matchNeighborhoodWithConfig(addr.neighborhood || '')
          if (matchedNeighborhood) {
            setNeighborhood(matchedNeighborhood)
            setAddressReadonly(true)
            setIsNewAddress(false)
          } else if (isStrictNeighborhoods && availableNeighborhoodsList.length > 0) {
            setNeighborhood('')
            setAddressReadonly(false)
            setIsNewAddress(false)
            setUnservedNeighborhood(addr.neighborhood || '')
            return
          } else {
            setNeighborhood(addr.neighborhood || '')
            setAddressReadonly(true)
            setIsNewAddress(false)
          }
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
    if (fulfillmentType === 'DELIVERY' && isStrictNeighborhoods && availableNeighborhoodsList.length > 0) {
      const matched = matchNeighborhoodWithConfig(addr.neighborhood || '')
      if (!matched) {
        setUnservedNeighborhood(addr.neighborhood || '')
        setIsAddressesModalOpen(false)
        setCheckoutWizardStep(3)
        return
      }
      setNeighborhood(matched)
    } else {
      setNeighborhood(addr.neighborhood || '')
    }
    setZipcode(
      addr.zipcode ? formatCep(addr.zipcode.toString().padStart(8, '0')) : '',
    )
    setStreet(addr.street || '')
    setNumber(addr.number ? addr.number.toString() : '')
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

  const handleSearchCEPCheckout = async (rawCepInput?: string) => {
    const rawCep = (rawCepInput ?? zipcode).replace(/\D/g, '')
    if (rawCep.length !== 8) return

    setIsSearchingCEPCheckout(true)
    setUnservedNeighborhood(null)
    try {
      type CepResult = {
        street: string
        neighborhood: string
        city: string
        state: string
      }

      const requests = await Promise.allSettled([
        fetch(`https://viacep.com.br/ws/${rawCep}/json/`).then(async (response) => {
          if (!response.ok) throw new Error(`ViaCEP HTTP ${response.status}`)
          const data = await response.json()
          if (data.erro) throw new Error('CEP não encontrado no ViaCEP')
          return {
            street: data.logradouro || '',
            neighborhood: data.bairro || '',
            city: data.localidade || '',
            state: data.uf || '',
          } satisfies CepResult
        }),
        fetch(`https://brasilapi.com.br/api/cep/v1/${rawCep}`).then(async (response) => {
          if (!response.ok) throw new Error(`BrasilAPI HTTP ${response.status}`)
          const data = await response.json()
          return {
            street: data.street || '',
            neighborhood: data.neighborhood || '',
            city: data.city || '',
            state: data.state || '',
          } satisfies CepResult
        }),
      ])

      const cepResults = requests
        .filter((result): result is PromiseFulfilledResult<CepResult> => result.status === 'fulfilled')
        .map((result) => result.value)
        .filter((result) => result.street || result.neighborhood || result.city)

      if (requests.some((result) => result.status === 'rejected')) {
        console.warn('Uma das APIs de CEP não respondeu:', requests.filter((result) => result.status === 'rejected'))
      }

      const cityFromResults = cepResults.find((result) => result.city)?.city || ''
      const validNeighborhoodResults = cepResults.filter((result) =>
        result.neighborhood && normalizeText(result.neighborhood) !== normalizeText(result.city || cityFromResults),
      )
      const configuredNeighborhoodResult = validNeighborhoodResults.find((result) =>
        matchNeighborhoodWithConfig(result.neighborhood),
      )
      const selectedResult = configuredNeighborhoodResult || validNeighborhoodResults[0] || cepResults[0]

      const streetVal = cepResults.find((result) => result.street)?.street || ''
      const neighborhoodVal = selectedResult?.neighborhood || ''
      const cityVal = selectedResult?.city || cityFromResults
      const stateVal = selectedResult?.state || cepResults.find((result) => result.state)?.state || ''
      if (streetVal || neighborhoodVal || cityVal) {
        setStreet(streetVal)
        setCity(cityVal)
        setState(stateVal)

        const matched = matchNeighborhoodWithConfig(neighborhoodVal)
        const sameAsCity = normalizeText(neighborhoodVal) === normalizeText(cityVal)
        if (matched) {
          setNeighborhood(matched)
        } else if (neighborhoodVal && !sameAsCity) {
          if (isStrictNeighborhoods && availableNeighborhoodsList.length > 0) {
            setNeighborhood('')
            setUnservedNeighborhood(neighborhoodVal)
          } else {
            setNeighborhood(neighborhoodVal)
          }
        }

        // Fluxo guiado: ao localizar o CEP, ativa automaticamente a detecção de GPS do aparelho
        setGpsTriggerNonce((prev) => prev + 1)
        setTimeout(() => {
          document.getElementById('checkout-number-input')?.focus()
        }, 100)
      }
    } catch (err) {
      console.error('Erro ao consultar CEP:', err)
    } finally {
      setIsSearchingCEPCheckout(false)
    }
  }

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawCep = e.target.value.replace(/\D/g, '').slice(0, 8)
    setZipcode(formatCep(rawCep))
    if (rawCep.length === 8) {
      handleSearchCEPCheckout(rawCep)
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

  const parseDeliveryFee = (value: unknown, fallback = 0) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    const normalized = String(value ?? '').replace(/[^0-9,.-]/g, '').replace(',', '.')
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  const findDeliverySector = (value: string) => {
    if (!value?.trim()) return null
    let sectors = profile?.deliverySectors || profile?.delivery_sectors || []
    if (typeof sectors === 'string') {
      try { sectors = JSON.parse(sectors) } catch { sectors = [] }
    }
    if (!Array.isArray(sectors)) return null

    const normalizedValue = normalizeText(value)
    return sectors.find((sector: any) =>
      Array.isArray(sector?.neighborhoods) && sector.neighborhoods.some((name: string) => {
        const normalizedName = normalizeText(name)
        return normalizedName === normalizedValue ||
          normalizedName.includes(normalizedValue) ||
          normalizedValue.includes(normalizedName)
      }),
    ) || null
  }

  // Política de bairros: FALLBACK (padrão) lista todos os bairros da cidade; STRICT só os dos setores
  const isStrictNeighborhoods = profile?.neighborhoodPolicy === 'STRICT'

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
    let fromBank: string[] = []
    if (profile?.neighborhoodPolicy !== 'STRICT') {
      let bank = profile?.availableNeighborhoods || []
      if (typeof bank === 'string') {
        try {
          bank = JSON.parse(bank)
        } catch {
          bank = []
        }
      }
      if (Array.isArray(bank)) fromBank = bank
    }
    const seen = new Set<string>()
    const unique = [...fromSectors, ...fromBank].filter((n: any) => {
      const key = normalizeText(String(n || ''))
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    }) as string[]
    return unique.sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [profile])

  // Taxa mostrada ao lado do bairro na lista (setor ou taxa padrão)
  const feeLabelForNeighborhood = (name: string) => {
    const sector = findDeliverySector(name)
    const fee = sector?.fee !== undefined ? parseDeliveryFee(sector.fee) : parseDeliveryFee(profile?.deliveryFee)
    return fee === 0 ? 'Grátis' : formatCurrency(fee)
  }

  const matchedSector = useMemo(
    () => findDeliverySector(neighborhood),
    [fulfillmentType, neighborhood, profile],
  )
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
      return { hasSectors: false, minFee: parseDeliveryFee(profile?.deliveryFee) }
    }
    const fees = sectors.map((s: any) => parseDeliveryFee(s.fee))
    const minFee = Math.min(...fees)
    const maxFee = Math.max(...fees)
    return { hasSectors: true, minFee, maxFee, sectors }
  }, [profile])

  const matchNeighborhoodWithConfig = (cepNeighborhood: string) => {
    if (!cepNeighborhood) return ''
    const target = normalizeText(cepNeighborhood)

    // 1. Prioriza os setores de entrega configurados com taxa
    let sectors = profile?.deliverySectors || profile?.delivery_sectors || []
    if (typeof sectors === 'string') {
      try { sectors = JSON.parse(sectors) } catch { sectors = [] }
    }
    if (!Array.isArray(sectors)) sectors = []

    const sectorNeighborhoods: string[] = []
    sectors.forEach((s: any) => {
      if (Array.isArray(s.neighborhoods)) {
        sectorNeighborhoods.push(...s.neighborhoods)
      }
    })

    // Match exato nos setores
    const exactSector = sectorNeighborhoods.find(
      (n) => normalizeText(n) === target,
    )
    if (exactSector) return exactSector

    // Match parcial nos setores (ex: "Copacabana" -> "Balneário Copacabana")
    const partialSector = sectorNeighborhoods.find((n) => {
      const norm = normalizeText(n)
      return norm.includes(target) || target.includes(norm)
    })
    if (partialSector) return partialSector

    // 2. Se não achou nos setores, busca na lista geral de bairros disponíveis
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

  // Garante que cliques/toques estejam sempre liberados quando os modais estiverem fechados
  useEffect(() => {
    if (!isCustomizerOpen && !isCartModalOpen && !isCheckoutStepOpen) {
      document.body.style.pointerEvents = ''
    }
  }, [isCustomizerOpen, isCartModalOpen, isCheckoutStepOpen])

  const handleProductClick = (product: Product) => {
    // Abre o customizador para qualquer produto, permitindo escolher frações, adicionais ou observações de produção com atalhos frequentes
    setCustomizingProduct(product as ProductItem)
    setIsCustomizerOpen(true)
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
    return matchedSector?.fee !== undefined
      ? parseDeliveryFee(matchedSector.fee)
      : parseDeliveryFee(profile?.deliveryFee)
  }, [fulfillmentType, matchedSector, profile])
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
    const key = pixKeyResolved
    if (!key) return ''
    return generatePixBRCode({
      pixKey: key,
      merchantName: profile?.tradeName || tenantName,
      merchantCity: profile?.city || 'SAO PAULO',
      amount: cartTotal,
    })
  }, [profile, tenantName, cartTotal])

  // QR Code do Pix gerado no próprio aparelho (nada é enviado a serviços externos)
  useEffect(() => {
    let active = true
    if (!pixBRCodePayload) {
      setPixQrDataUrl('')
      return
    }
    QRCode.toDataURL(pixBRCodePayload, { width: 320, margin: 1, errorCorrectionLevel: 'M' })
      .then((url: string) => {
        if (active) setPixQrDataUrl(url)
      })
      .catch(() => {
        if (active) setPixQrDataUrl('')
      })
    return () => {
      active = false
    }
  }, [pixBRCodePayload])

  const handleOpenCheckout = () => {
    if (!storeStatus.isOpen) {
      alert(`O estabelecimento está fechado no momento: ${storeStatus.reason}`)
      return
    }
    if (!isMinOrderSatisfied) {
      alert(`O valor mínimo para pedido é de ${formatCurrency(minOrderValue)}.`)
      return
    }
    setCheckoutWizardStep(1)
    setIsCheckoutStepOpen(true)
    setIsCartModalOpen(false)
  }

  const registerClientInBackend = async () => {
    if (!customerName.trim() || !customerPhone.trim()) return
    try {
      const rawPhone = customerPhone.replace(/\D/g, '')
      const rawZipcode = zipcode.replace(/\D/g, '')
      const isTakeout = fulfillmentType === 'TAKEOUT'

      const payload = {
        name: customerName,
        phone: rawPhone,
        isTakeout: isTakeout,
        street: isTakeout ? '' : street,
        number: isTakeout ? '' : (number || 'S/N'),
        neighborhood: isTakeout ? '' : neighborhood,
        city: isTakeout ? '' : (city || profile?.city || 'Local'),
        state: isTakeout ? '' : (state || profile?.state || 'SP'),
        zipcode: isTakeout ? undefined : (rawZipcode || undefined),
        complement: isTakeout ? undefined : (complement || undefined),
        isNewAddress,
      }

      const res = await api.post('/public/checkout/client', payload)
      if (res.data && res.data.client) {
        setClientFound(true)
        if (res.data.client.addresses) {
          const validAddrs = res.data.client.addresses.filter((a: any) =>
            !a.street?.toLowerCase().includes('retirada') &&
            !a.neighborhood?.toLowerCase().includes('balcão')
          )
          setSavedAddresses(validAddrs)
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
        setCheckoutWizardStep(3)
        return
      }
      if (isStrictNeighborhoods && deliverySectorInfo.hasSectors) {
        const isAllowed = matchedSector !== null || deliverySectorInfo.sectors.some(
          (sec: any) => Array.isArray(sec.neighborhoods) && sec.neighborhoods.some((n: string) => normalizeText(n) === normalizeText(neighborhood))
        )
        if (!isAllowed) {
          setUnservedNeighborhood(neighborhood)
          setNeighborhood('')
          setCheckoutWizardStep(3)
          return
        }
      }
    }

    try {
      // 1. Registra dados do cliente no backend via API publica
      await registerClientInBackend()

      let orderApiRes: any = null
      const isTakeout = fulfillmentType === 'TAKEOUT'
      // 2. Envia pedido para fila de sincronização do PDV
      try {
        orderApiRes = await api.post('/public/orders', {
          client_name: customerName,
          client_phone: customerPhone,
          origin: isTakeout ? 'Balcão' : 'Delivery',
          isTakeout: isTakeout,
          street: isTakeout ? '' : street,
          number: isTakeout ? '' : (number || 'S/N'),
          neighborhood: isTakeout ? '' : neighborhood,
          city: isTakeout ? '' : (city || 'Local'),
          state: isTakeout ? '' : (state || 'UF'),
          zipcode: isTakeout ? undefined : (zipcode || undefined),
          complement: isTakeout ? undefined : (complement || undefined),
          reference: isTakeout ? undefined : (referencePoint || undefined),
          payment_method_name:
            paymentMethod === 'PIX'
              ? 'PIX'
              : paymentMethod === 'CREDIT'
                ? 'Cartão de Crédito'
                : paymentMethod === 'DEBIT'
                  ? 'Cartão de Débito'
                  : paymentMethod === 'VOUCHER'
                    ? (availablePaymentMethods.voucherName || 'Vale Refeição')
                    : paymentMethod === 'CASH'
                      ? 'Dinheiro'
                      : paymentMethod,
          change_for: changeAmount ? Number(changeAmount) : undefined,
          delivery_fee: isTakeout ? 0 : resolvedDeliveryFee,
          total_amount: cartTotal,
          notes: `${isTakeout ? 'Retirada no Balcão' : 'Entrega (Delivery)'}${deliveryCoords ? ` (GPS: ${deliveryCoords.lat.toFixed(6)},${deliveryCoords.lng.toFixed(6)})` : ''}`,
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
          setUnservedNeighborhood(neighborhood)
          setNeighborhood('')
          setCheckoutWizardStep(3)
        } else {
          alert(`Não foi possível registrar o pedido no caixa: ${errorMsg}`)
        }
        return
      }

      // 3. Formata mensagem estruturada ultra-profissional para o WhatsApp
      const now = new Date()
      const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`
      const formattedTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

      let text = `🧾 *NOVO PEDIDO - ${(profile?.tradeName || tenantName).toUpperCase()}*
`
      text += `📅 _${formattedDate} às ${formattedTime}_
`
      text += `━━━━━━━━━━━━━━━━━━━━━━━━

`
      text += `👤 *Cliente:* ${customerName}
`
      text += `📱 *WhatsApp:* ${customerPhone}
`
      text += `🛵 *Tipo:* ${
        fulfillmentType === 'DELIVERY'
          ? 'Entrega (Delivery)'
          : fulfillmentType === 'TAKEOUT'
            ? 'Retirada no Balcão'
            : 'Consumo no Local'
      }
`

      if (fulfillmentType === 'DELIVERY') {
        text += `
📍 *Endereço de Entrega:*
`
        text += `> ${street}, ${number || 'S/N'}
`
        if (complement) text += `> Complemento: ${complement}
`
        text += `> ${neighborhood} - ${city || profile?.city || 'Local'}/${state || profile?.state || 'SP'}
`
        if (zipcode) text += `> CEP: ${zipcode}
`
        if (deliveryCoords) {
          text += `> 🗺️ Localização GPS: https://maps.google.com/?q=${deliveryCoords.lat},${deliveryCoords.lng}
`
        }
      }

      text += `
━━━━━━━━━━━━━━━━━━━━━━━━
`
      text += `📋 *ITENS DO PEDIDO:*

`

      cartItems.forEach((item) => {
        const itemTitle = item.displayName || item.product.name
        const itemTotal = item.unitPrice * item.quantity
        text += `▪️ *${item.quantity}x* ${itemTitle}
`
        text += `   _${formatCurrency(itemTotal)}_
`
        if (item.observation) {
          text += `   ↳ 💬 _Obs: ${item.observation}_
`
        }
        if (item.selectedOptions && item.selectedOptions.length > 0) {
          item.selectedOptions.forEach((opt) => {
            text += `   ↳ ➕ ${opt.quantity > 1 ? `${opt.quantity}x ` : ''}${opt.optionName} (${formatCurrency(opt.price * opt.quantity)})
`
          })
        }
        if (item.fractions && item.fractions.length > 0) {
          text += `   ↳ 🍕 Sabores: ${item.fractions.join(' / ')}
`
        }
        text += `
`
      })

      text += `━━━━━━━━━━━━━━━━━━━━━━━━
`
      text += `💵 Subtotal: *${formatCurrency(cartSubtotal)}*
`
      if (fulfillmentType === 'DELIVERY' && resolvedDeliveryFee > 0) {
        text += `🛵 Taxa de Entrega: *${formatCurrency(resolvedDeliveryFee)}*
`
      } else if (fulfillmentType === 'DELIVERY') {
        text += `🛵 Taxa de Entrega: *Grátis*
`
      }
      text += `💰 *TOTAL: ${formatCurrency(cartTotal)}*

`

      if (paymentMethod === 'PIX') {
        text += `💳 *Forma de Pagamento:* Pix
📎 _Vou enviar o comprovante do Pix nesta conversa._
`
      } else if (paymentMethod === 'CREDIT') {
        text += `💳 *Forma de Pagamento:* Cartão de Crédito (na entrega)
`
      } else if (paymentMethod === 'DEBIT') {
        text += `💳 *Forma de Pagamento:* Cartão de Débito (na entrega)
`
      } else if (paymentMethod === 'VOUCHER') {
        text += `💳 *Forma de Pagamento:* ${availablePaymentMethods.voucherName || 'Vale Refeição'} (na entrega)
`
      } else if (paymentMethod === 'CASH') {
        const trocoNum = parseFloat((changeAmount || '0').replace(',', '.'))
        if (trocoNum > cartTotal) {
          const levarTroco = trocoNum - cartTotal
          text += `💳 *Forma de Pagamento:* Dinheiro
`
          text += `💵 *Troco para:* ${formatCurrency(trocoNum)} _(Levar ${formatCurrency(levarTroco)} de troco)_
`
        } else if (changeAmount) {
          text += `💳 *Forma de Pagamento:* Dinheiro (Troco para R$ ${changeAmount})
`
        } else {
          text += `💳 *Forma de Pagamento:* Dinheiro (Sem troco)
`
        }
      } else {
        text += `💳 *Forma de Pagamento:* ${paymentMethod} (na entrega)
`
      }

      text += `━━━━━━━━━━━━━━━━━━━━━━━━
`
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

      const totalItemsCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
      const itemsSummaryText = cartItems.map((item) => `${item.quantity}x ${item.displayName || item.product.name}`).join(' + ');
      setLastOrderItems(cartItems);
      setIsOrderItemsOpen(false);
      setLastOrderItemsCount(totalItemsCount || 1);
      setLastOrderItemsSummary(itemsSummaryText || 'Pedido');
      setLastOrderTotal(cartTotal);
      setLastOrderText(text);
      setCart({});
      setCheckoutWizardStep(6);
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

  // Efeito de escuta periódica do status do pedido criado (Live Tracking em tempo real)
  useEffect(() => {
    if (!createdOrderId || checkoutWizardStep !== 6) return;

    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/public/orders/${createdOrderId}/status`);
        const statusVal = res.data?.status || res.data?.order?.status || res.data?.data?.status;
        if (statusVal) {
          const newStatus = String(statusVal).toLowerCase().trim();
          setLiveOrderStatus((prev) => {
            if (prev !== newStatus) {
              const displayId = res.data?.display_id || res.data?.order?.display_id || createdDisplayId || '';
              const notifTag = 'order-' + (res.data?.id || createdOrderId) + '-' + newStatus;

              if (newStatus === 'in_preparation' || newStatus === 'in_production') {
                showBrowserNotification(`👨‍🍳 Pedido #${displayId} Confirmado!`, {
                  body: 'O restaurante aceitou seu pedido e a cozinha já está preparando tudo com carinho!',
                  icon: '/favicon.svg',
                  tag: notifTag,
                });
              } else if (newStatus === 'conferencia') {
                showBrowserNotification(`📋 Pedido #${displayId} em Conferência!`, {
                  body: 'Sua refeição está sendo conferida e embalada com todo cuidado.',
                  icon: '/favicon.svg',
                  tag: notifTag,
                });
              } else if (newStatus === 'ready') {
                showBrowserNotification(
                  fulfillmentType === 'TAKEOUT'
                    ? `🛍️ Pedido #${displayId} Pronto para Retirada!`
                    : `📦 Pedido #${displayId} Pronto para Expedição!`,
                  {
                    body: fulfillmentType === 'TAKEOUT'
                      ? 'Seu pedido está pronto no balcão aguardando sua retirada!'
                      : 'Seu pedido está embalado e aguardando o entregador.',
                    icon: '/favicon.svg',
                    tag: notifTag,
                  }
                );
              } else if (newStatus === 'dispatched') {
                showBrowserNotification(
                  fulfillmentType === 'TAKEOUT'
                    ? `🛍️ Pedido #${displayId} Pronto no Balcão!`
                    : `🛵 Pedido #${displayId} a Caminho!`,
                  {
                    body: fulfillmentType === 'TAKEOUT'
                      ? 'Você já pode vir retirar seu pedido no balcão!'
                      : 'O motoboy acabou de sair com o seu pedido. Prepare-se para receber!',
                    icon: '/favicon.svg',
                    tag: notifTag,
                  }
                );
              } else if (newStatus === 'delivered' || newStatus === 'completed') {
                const storeName = profile?.tradeName || profile?.name || 'Restaurante';
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
    }, 2500);

    return () => clearInterval(interval);
  }, [createdOrderId, checkoutWizardStep, createdDisplayId, fulfillmentType, profile]);

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
          className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all lg:hidden"
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
              <span className="text-xs font-semibold text-slate-500 shrink-0">
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
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm transition-all hover:bg-slate-100 active:scale-95 touch-manipulation cursor-pointer"
                      >
                        <Minus className="h-3 w-3 stroke-[2.5]" />
                      </button>
                      <span className="w-5 text-center text-xs font-black text-slate-900">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleIncrementCartItem(item.id)}
                        className="flex h-6 w-6 items-center justify-center rounded-full text-white shadow-sm transition-all active:scale-95 touch-manipulation cursor-pointer" style={{ backgroundColor: "var(--primary-color, #10B981)" }}
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
            <p className="text-xs text-slate-400">Taxa de entrega calculada a seguir</p>
          </div>
          <span className="text-2xl font-black text-slate-900 tracking-tight">
            {formatCurrency(cartSubtotal)}
          </span>
        </div>

        <button
          type="button"
          onClick={handleOpenCheckout}
          disabled={cartCount === 0 || !storeStatus.isOpen || !isMinOrderSatisfied}
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-black text-white shadow-lg transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40" style={{ backgroundColor: "var(--primary-color, #DC2626)" }}
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
          <div className="relative flex min-h-[220px] w-full flex-col justify-end overflow-hidden px-5 pt-8 pb-10 sm:pt-10 sm:pb-12 rounded-b-[36px] shadow-lg sm:min-h-[240px]" style={{ backgroundColor: "var(--primary-color, #200404)" }}>
            {/* Banner de fundo se houver */}
            <DynamicHero profile={profile} />
            <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-black/85 via-black/50 to-black/20" />

            {/* Conteúdo Posicionado Sobre o Header (Fiel à Imagem 3 Mobile e Imagem 4 Desktop) */}
            <div className="relative z-20 flex flex-col gap-3 text-white">
              {/* Ferramentas: tamanho do texto e informações da loja */}
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTextLevel((l) => (l + 1) % MENU_TEXT_SCALES.length)}
                  aria-label="Mudar o tamanho do texto"
                  className="flex min-h-11 items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-4 text-white backdrop-blur-md transition-all hover:bg-white/25 active:scale-95"
                >
                  <span className="flex items-baseline font-black leading-none">
                    <span className="text-sm">A</span>
                    <span className="text-lg">A</span>
                  </span>
                  <span className="text-xs font-bold text-white/80">
                    {textLevel === 0 ? 'Normal' : textLevel === 1 ? 'Grande' : 'Maior'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsStoreInfoOpen(true)}
                  className="flex min-h-11 items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-4 text-sm font-bold text-white backdrop-blur-md transition-all hover:bg-white/25 active:scale-95"
                >
                  <Info className="h-4 w-4" /> Informações
                </button>
              </div>

              <div className="flex min-w-0 items-center gap-3">
                {/* Logo circular com aro dourado refinado */}
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-amber-400/90 bg-black/40 p-0.5 shadow-xl">
                  {profile?.logo_url ? (
                    <img
                      src={resolveImageUrl(profile.logo_url)}
                      alt="Logo"
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <Store className="h-full w-full p-2.5 text-amber-400" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h1 className="break-words text-2xl font-black leading-tight tracking-tight text-white line-clamp-3 lg:text-3xl">
                    {profile?.tradeName || tenantName}
                  </h1>
                  <p className="mt-0.5 line-clamp-2 max-w-xl text-sm font-medium text-white/85">
                    {profile?.description || profile?.subtitle || 'Culinária artesanal com ingredientes nobres'}
                  </p>
                </div>
              </div>
              {/* Badges de Atendimento */}
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                {!storeStatus.isOpen ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/90 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm backdrop-blur-md">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                    {storeStatus.reason}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#10b981] px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-white shadow-sm">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                    ABERTO AGORA
                  </span>
                )}

                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/30 px-3.5 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-md">
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
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/30 px-3.5 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-md hover:bg-black/50 transition-all cursor-pointer shadow-sm text-left"
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
                placeholder="Buscar no cardápio"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-base font-medium text-slate-800 placeholder-slate-400 outline-none"
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
                const catCount = cat === 'All' ? (products?.length || 0) : (groupedProducts[cat]?.length || 0)
                const baseLabel = cat === 'All' ? 'Menu Completo' : cat
                const labelWithCount = isActive && cat !== 'All' ? `${baseLabel} (${catCount})` : baseLabel
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`shrink-0 min-h-11 rounded-full px-5 py-2 text-sm font-bold transition-all ${
                      isActive
                        ? 'text-white shadow-sm ring-1 ring-black/10'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                    style={isActive ? { backgroundColor: 'var(--primary-color, #DC2626)' } : undefined}
                  >
                    {labelWithCount}
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
                    <div className="mb-4 flex items-center gap-2.5">
                      <h2 className="break-words text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                        {catName}
                      </h2>
                      <span className="shrink-0 rounded-full bg-slate-200/80 px-2.5 py-0.5 text-sm font-extrabold text-slate-700">
                        {prods.length} {prods.length === 1 ? 'item' : 'itens'}
                      </span>
                    </div>
                  )}

                  {/* CONTAINER RESPONSIVO DE PRODUTOS: LISTA MOBILE (IMAGEM 3) / GRID DESKTOP (IMAGEM 4) */}
                  <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-5">
                    {prods.map((product) => {
                      const isCustomizable =
                        (product.complementGroups && product.complementGroups.length > 0) ||
                        Boolean(product.subcategory?.accepts_fractions)
                      const totalInCart = getProductCartCount(product.id)
                      const metaLabel = getProductMetaLabel(product)

                      const renderActionButton = (isCompact = false) => {
                        const btnBase =
                          'flex items-center justify-center gap-2 font-black text-white shadow-sm transition-transform active:scale-95 touch-manipulation cursor-pointer'
                        const btnSize = isCompact
                          ? 'w-full min-h-12 rounded-2xl px-4 text-base'
                          : 'min-h-11 rounded-xl px-4 text-sm'

                        if (isCustomizable) {
                          return (
                            <button
                              type="button"
                              onClick={() => handleProductClick(product)}
                              className={`${btnBase} ${btnSize}`}
                              style={{ backgroundColor: 'var(--primary-color, #DC2626)' }}
                            >
                              {totalInCart > 0 ? (
                                <>
                                  <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white/25 px-1 text-xs font-black">
                                    {totalInCart}
                                  </span>
                                  Adicionar
                                </>
                              ) : (
                                <>
                                  <Plus className="h-5 w-5 stroke-[3]" />
                                  Adicionar
                                </>
                              )}
                            </button>
                          )
                        }

                        if (cart[product.id]) {
                          const stepBtn = isCompact ? 'h-11 w-11' : 'h-9 w-9'
                          return (
                            <div
                              className={`flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/80 p-1 ${
                                isCompact ? 'w-full justify-between' : ''
                              }`}
                            >
                              <button
                                type="button"
                                aria-label="Diminuir quantidade"
                                onClick={() => handleRemoveFromCart(product.id)}
                                className={`flex ${stepBtn} items-center justify-center rounded-full bg-white text-slate-600 shadow-sm transition-all hover:bg-slate-100 active:scale-95 touch-manipulation cursor-pointer`}
                              >
                                <Minus className="h-5 w-5 stroke-[3]" />
                              </button>
                              <span className="min-w-8 text-center text-lg font-black text-slate-900">
                                {cart[product.id].quantity}
                              </span>
                              <button
                                type="button"
                                aria-label="Aumentar quantidade"
                                onClick={() => handleAddToCart(product)}
                                className={`flex ${stepBtn} items-center justify-center rounded-full text-white shadow-sm transition-all active:scale-95 touch-manipulation cursor-pointer`}
                                style={{ backgroundColor: 'var(--primary-color, #DC2626)' }}
                              >
                                <Plus className="h-5 w-5 stroke-[3]" />
                              </button>
                            </div>
                          )
                        }

                        return (
                          <button
                            type="button"
                            onClick={() => handleAddToCart(product)}
                            className={`${btnBase} ${btnSize}`}
                            style={{ backgroundColor: 'var(--primary-color, #DC2626)' }}
                          >
                            <Plus className="h-5 w-5 stroke-[3]" />
                            Adicionar
                          </button>
                        )
                      }

                      const metaShort = String(metaLabel || '').replace(/^UNIT[ÁA]RIO\s*(•\s*)?/i, '').trim()

                      return (
                        <Fragment key={product.id}>
                          {/* 1. CARD MOBILE: foto + texto e botão de largura total (alvo de toque grande) */}
                          <div className="sm:hidden group relative space-y-3 rounded-3xl border border-slate-100 bg-white p-3 shadow-xs transition-all hover:shadow-sm">
                            <div className="flex items-start gap-3">
                              {/* Foto: largura fluida, nunca esmaga o texto */}
                              <div
                                className="aspect-square w-[28%] min-w-[4.5rem] max-w-[7.5rem] shrink-0 cursor-pointer overflow-hidden rounded-2xl bg-slate-100"
                                onClick={() => handleProductClick(product)}
                              >
                                {product.imageUrl ? (
                                  <img
                                    src={resolveImageUrl(product.imageUrl)}
                                    alt={product.name}
                                    onError={(e) => {
                                      (e.currentTarget.parentElement as HTMLElement)?.classList.add('hidden')
                                    }}
                                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-slate-300">
                                    <UtensilsCrossed className="h-8 w-8 opacity-30" />
                                  </div>
                                )}
                              </div>

                              <div
                                onClick={() => handleProductClick(product)}
                                className="min-w-0 flex-1 cursor-pointer space-y-1"
                              >
                                <h3 className="break-words text-lg font-extrabold leading-snug text-slate-900 line-clamp-3">
                                  {product.name}
                                </h3>
                                {product.description && (
                                  <p className="break-words text-sm leading-snug text-slate-600 line-clamp-2">
                                    {product.description}
                                  </p>
                                )}
                                {metaShort && (
                                  <span className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                                    {metaShort}
                                  </span>
                                )}
                                <span className="block text-xl font-black tracking-tight text-slate-900">
                                  {formatCurrency(product.price)}
                                </span>
                              </div>
                            </div>

                            {renderActionButton(true)}
                          </div>
                          {/* 2. CARD DESKTOP (EXCLUSIVO DESKTOP - FIEL À IMAGEM 4) */}
                          <div className="hidden sm:flex group relative flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs hover:shadow-md transition-all">
                            {/* Imagem Proporcional no Topo */}
                            <div
                              className="h-44 w-full overflow-hidden bg-slate-50 shrink-0 cursor-pointer"
                              onClick={() => handleProductClick(product)}
                            >
                              {product.imageUrl ? (
                                <img
                                  src={resolveImageUrl(product.imageUrl)}
                                  alt={product.name}
                                  onError={(e) => {
                                    (e.currentTarget.parentElement as HTMLElement)?.classList.add('hidden')
                                  }}
                                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-slate-300">
                                  <UtensilsCrossed className="h-12 w-12 opacity-30" />
                                </div>
                              )}
                            </div>

                            {/* Corpo do Card com Metadados e Título */}
                            <div className="flex flex-1 flex-col justify-between p-4 space-y-2">
                              <div>
                                {metaShort && (
                                  <span className="mb-1 block text-xs font-extrabold uppercase tracking-wider text-slate-500">
                                    {metaShort}
                                  </span>
                                )}
                                <h3
                                  onClick={() => handleProductClick(product)}
                                  className="min-h-[3rem] cursor-pointer break-words text-lg font-extrabold leading-snug text-slate-900 line-clamp-2"
                                >
                                  {product.name}
                                </h3>
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-50">
                                <span className="text-xl font-black tracking-tight text-slate-900">
                                  {formatCurrency(product.price)}
                                </span>
                                <div>{renderActionButton(false)}</div>
                              </div>
                            </div>
                          </div>
                        </Fragment>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        {/* Rodapé da Página Desktop/Geral (Fiel à Imagem 4) */}
        <footer className="mt-auto border-t border-slate-200/80 bg-white px-6 py-6 text-sm text-slate-500">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-center text-slate-500 sm:text-left">
              © {new Date().getFullYear()} {profile?.tradeName || tenantName}. Todos os direitos reservados.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-medium text-slate-500">
              <a href="#termos" onClick={(e) => { e.preventDefault(); alert('Termos de Uso do Estabelecimento.'); }} className="hover:text-slate-800 transition-colors">Termos de Uso</a>
              <span>•</span>
              <a href="#privacidade" onClick={(e) => { e.preventDefault(); alert('Políticas de Privacidade e Proteção de Dados.'); }} className="hover:text-slate-800 transition-colors">Políticas de Privacidade</a>
              <span>•</span>
              <a href="#ajuda" onClick={(e) => { e.preventDefault(); setIsStoreInfoOpen(true); }} className="hover:text-slate-800 transition-colors">Ajuda</a>
            </div>
          </div>
        </footer>
      </main>

      {/* Sidebar Carrinho Desktop */}
      <aside className="z-30 hidden w-[400px] shrink-0 self-start border-l border-slate-200 bg-white shadow-2xl lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-hidden">
        {renderCartSection()}
      </aside>

      {/* Botão Flutuante Mobile Estilo Stitch (Fiel à Imagem 3) */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div
            key="mobile-floating-cart-bar"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0.2 }}
            className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 right-4 z-40 max-w-md mx-auto lg:hidden"
          >
            <button
              type="button"
              onClick={() => setIsCartModalOpen(true)}
              className="flex min-h-14 w-full flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-2xl bg-[#101828] px-4 py-3 text-white shadow-2xl transition-transform active:scale-[0.98] border border-slate-800 touch-manipulation cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-white font-black text-sm shadow-inner">
                  {cartCount}
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 leading-tight">
                    Subtotal
                  </p>
                  <p className="text-lg font-black text-white leading-tight">
                    {formatCurrency(cartSubtotal)}
                  </p>
                </div>
              </div>
              <span className="flex items-center gap-1 text-base font-black text-amber-400 hover:text-amber-300 transition-colors">
                <span>Ver Sacola</span>
                <ChevronRight className="h-4 w-4 stroke-[3]" />
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
              <div className="mx-auto mt-3 mb-1 h-1.5 w-12 rounded-full bg-slate-200 shrink-0" />
              <div className="flex-1 overflow-hidden">
                {renderCartSection()}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ItemCustomizerDialog
        open={isCustomizerOpen}
        onOpenChange={(open) => {
          setIsCustomizerOpen(open)
          if (!open) {
            document.body.style.pointerEvents = ''
          }
        }}
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
      <Dialog open={isCheckoutStepOpen} onOpenChange={(open) => {
        setIsCheckoutStepOpen(open)
        if (!open && checkoutWizardStep === 6) {
          handleFinishAndReset()
        }
      }}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg !bg-white text-slate-900 border border-slate-100 shadow-2xl p-5 sm:p-6 rounded-3xl [&>button.absolute]:hidden">
          {/* Alça superior estilo folha nativa mobile */}
          <div className="w-12 h-1 rounded-full bg-slate-300 mx-auto -mt-1 mb-3" />

          {/* Cabeçalho Fiel ao Stitch */}
          <DialogHeader className="pb-2 border-b border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-[9rem] flex-1">
                <DialogTitle className="text-xl font-black leading-tight text-slate-900">
                  {checkoutWizardStep === 1 && 'Como receber'}
                  {checkoutWizardStep === 2 && 'Seus dados'}
                  {checkoutWizardStep === 3 && 'Endereço'}
                  {checkoutWizardStep === 4 && 'Local no mapa'}
                  {checkoutWizardStep === 5 && 'Pagamento'}
                  {checkoutWizardStep === 6 && 'Seu pedido'}
                </DialogTitle>
                <DialogDescription className="text-sm font-semibold text-slate-500 line-clamp-2">
                  {profile?.name || tenantName || 'Alta Gastronomia Express'}
                </DialogDescription>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  aria-label="Meus dados"
                  onClick={() => {
                    if (customerPhone) setCheckoutWizardStep(2)
                  }}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-800 text-white shadow-xs transition-all hover:bg-emerald-900"
                  title={customerName ? `Identificado: ${customerName}` : 'Identificação'}
                >
                  <User className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label="Fechar"
                  onClick={() => {
                    if (checkoutWizardStep === 6) {
                      handleFinishAndReset()
                    } else {
                      setIsCheckoutStepOpen(false)
                    }
                  }}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-all hover:bg-slate-200"
                  title="Fechar"
                >
                  <X className="h-5 w-5 stroke-[2.5]" />
                </button>
              </div>
            </div>

            {/* Progresso: barras + um único rótulo do passo atual (não quebra em telas estreitas) */}
            {checkoutWizardStep < 6 && (() => {
              const stepNames =
                fulfillmentType === 'TAKEOUT'
                  ? ['Sacola', 'Dados', 'Pagamento']
                  : ['Sacola', 'Dados', 'Entrega', 'Mapa', 'Pagamento']
              const currentIdx =
                fulfillmentType === 'TAKEOUT'
                  ? checkoutWizardStep === 1 ? 0 : checkoutWizardStep === 2 ? 1 : 2
                  : checkoutWizardStep - 1
              return (
                <div className="pt-2.5 pb-1">
                  <div className="flex gap-2">
                    {stepNames.map((name, i) => (
                      <div
                        key={name}
                        className={`h-2 flex-1 rounded-full transition-all ${i <= currentIdx ? 'bg-emerald-700' : 'bg-slate-200'}`}
                      />
                    ))}
                  </div>
                  <p className="mt-1.5 text-sm font-bold text-slate-600">
                    Passo {currentIdx + 1} de {stepNames.length} · <span className="text-emerald-800">{stepNames[currentIdx]}</span>
                  </p>
                </div>
              )
            })()}
          </DialogHeader>

          {/* ============================================================ */}
          {/* ETAPA 1: ESCOLHA DE RECEBIMENTO (FIEL AO CANVAS DO STITCH)   */}
          {/* ============================================================ */}
          {checkoutWizardStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 py-2 text-sm"
            >
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-950 tracking-tight">
                  Como deseja receber seu pedido?
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-snug">
                  Escolha a modalidade mais conveniente para apreciar sua experiência gastronômica.
                </p>
              </div>

              {/* Cards de Opção */}
              <div className="space-y-3 pt-1">
                {/* CARD 1: ENTREGA DELIVERY */}
                <button
                  type="button"
                  onClick={() => setFulfillmentType('DELIVERY')}
                  className={`w-full relative flex flex-col p-4 sm:p-5 rounded-3xl border-2 transition-all text-left shadow-xs ${
                    fulfillmentType === 'DELIVERY'
                      ? 'border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-600/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between w-full">
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-800 text-white shadow-sm">
                        <Rocket className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="text-base font-black text-slate-900">
                          Entrega Delivery
                        </h4>
                        <p className="text-xs text-slate-600 mt-0.5 leading-snug">
                          Direto na sua porta com embalagem térmica
                        </p>
                      </div>
                    </div>
                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all ${
                      fulfillmentType === 'DELIVERY'
                        ? 'bg-emerald-800 text-white'
                        : 'border-2 border-slate-300 bg-white'
                    }`}>
                      {fulfillmentType === 'DELIVERY' && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </div>
                  </div>

                  {/* Pill de Entrega (Somente Mais Escolhido como no Canvas do Stitch) */}
                  <div className="flex items-center gap-2 mt-3.5">
                    <span className="flex items-center gap-1 rounded-xl bg-emerald-100/90 px-3 py-1 text-xs font-bold text-emerald-950">
                      🔥 Mais escolhido
                    </span>
                  </div>
                </button>

                {/* CARD 2: RETIRAR NO BALCÃO */}
                <button
                  type="button"
                  onClick={() => {
                    setFulfillmentType('TAKEOUT')
                    setNeighborhood('Balcão')
                    setStreet('Retirada no Balcão')
                    setNumber('0')
                  }}
                  className={`w-full relative flex flex-col p-4 sm:p-5 rounded-3xl border-2 transition-all text-left shadow-xs ${
                    fulfillmentType === 'TAKEOUT'
                      ? 'border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-600/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between w-full">
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 shadow-sm">
                        <Store className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="text-base font-black text-slate-900">
                          Retirar no Balcão
                        </h4>
                        <p className="text-xs text-slate-600 mt-0.5 leading-snug">
                          Retire quentinho e sem fila de espera
                        </p>
                      </div>
                    </div>
                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all ${
                      fulfillmentType === 'TAKEOUT'
                        ? 'bg-emerald-800 text-white'
                        : 'border-2 border-slate-300 bg-white'
                    }`}>
                      {fulfillmentType === 'TAKEOUT' && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </div>
                  </div>

                  {/* Pills de Balcão (Tempo de Cozinha / Retirada) */}
                  <div className="flex items-center gap-2 mt-3.5 flex-wrap">
                    <span className="flex items-center gap-1.5 rounded-xl bg-blue-100/70 px-3 py-1 text-xs font-bold text-blue-950">
                      <Clock className="h-3.5 w-3.5 text-blue-700" />
                      {profile?.takeoutEstimatedTime ||
                        (profile?.preparationTimeMin
                          ? `${profile.preparationTimeMin} – ${profile.preparationTimeMax || profile.preparationTimeMin + 5} min`
                          : '15 - 20 min')}
                    </span>
                    <span className="flex items-center gap-1 rounded-xl bg-indigo-100/70 px-3 py-1 text-xs font-bold text-indigo-950">
                      🏷️ Sem taxa de entrega
                    </span>
                  </div>
                </button>
              </div>

              {/* Voltar ao Cardápio */}
              <div className="pt-3 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsCheckoutStepOpen(false)
                    setIsCartModalOpen(true)
                  }}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors inline-flex items-center gap-1.5"
                >
                  <ChevronLeft className="h-4 w-4" /> Voltar ao Cardápio
                </button>
              </div>

              {/* Barra inferior fixa: total dos itens (sem taxa presumida) + frete */}
              <div className="sticky bottom-0 -mx-5 sm:-mx-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-slate-100 bg-white px-5 sm:px-6 pt-3 pb-1">
                <div>
                  <span className="block text-2xl font-black leading-tight text-slate-950">{formatCurrency(cartSubtotal)}</span>
                  {fulfillmentType === 'DELIVERY' && (
                    <button
                      type="button"
                      disabled={availableNeighborhoodsList.length === 0}
                      onClick={() => setIsNeighborhoodPickerOpen(true)}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-900 disabled:text-slate-500"
                    >
                      {neighborhood.trim()
                        ? (resolvedDeliveryFee > 0 ? `+ ${formatCurrency(resolvedDeliveryFee)} de frete` : '+ entrega grátis')
                        : '+ frete · consultar bairro'}
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setCheckoutWizardStep(2)}
                  className="flex min-h-12 min-w-[8rem] flex-1 items-center justify-center gap-2 rounded-2xl px-5 text-base font-black text-white shadow-lg transition-all active:scale-[0.98] bg-emerald-800 hover:bg-emerald-900"
                >
                  <span>Continuar</span>
                  <ChevronRight className="h-4 w-4 stroke-[3]" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ============================================================ */}
          {/* ETAPA 2: IDENTIFICAÇÃO DO CLIENTE (SEUS DADOS DE CONTATO)   */}
          {/* ============================================================ */}
          {checkoutWizardStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4 py-2 text-sm"
            >
              {/* Telefone: ao completar, busca o cadastro sozinho */}
              <div className="flex items-center rounded-2xl border border-slate-200 bg-white px-3.5 py-3.5 shadow-xs focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500">
                <span className="mr-2.5 shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                  +55
                </span>
                <input
                  ref={phoneInputRef}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="WhatsApp com DDD"
                  aria-label="WhatsApp com DDD"
                  value={customerPhone}
                  onChange={handlePhoneChange}
                  className="w-full bg-transparent text-base font-bold text-slate-900 placeholder:font-medium placeholder:text-slate-400 outline-none"
                />
                {isLoadingPhone ? (
                  <Loader2 className="ml-2 h-5 w-5 shrink-0 animate-spin text-emerald-600" />
                ) : phoneReady ? (
                  <div className="ml-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                ) : null}
              </div>

              {/* Cliente identificado: uma linha, sem explicação */}
              {clientFound && customerName && !isLoadingPhone && (
                <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 px-3.5 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white">
                    <Check className="h-4 w-4 stroke-[3]" />
                  </div>
                  <span className="truncate text-base font-black text-slate-950">{customerName}</span>
                </div>
              )}

              {/* Não identificado: pede só o nome */}
              {showNameField && (
                <div className="flex items-center rounded-2xl border border-slate-200 bg-white px-3.5 py-3.5 shadow-xs focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500">
                  <User className="mr-2.5 h-4 w-4 shrink-0 text-slate-400" />
                  <input
                    ref={nameInputRef}
                    type="text"
                    autoComplete="name"
                    enterKeyHint="next"
                    placeholder="Seu nome"
                    aria-label="Seu nome"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && canAdvanceIdentification) handleAdvanceIdentification()
                    }}
                    className="w-full bg-transparent text-base font-bold text-slate-900 placeholder:font-medium placeholder:text-slate-400 outline-none"
                  />
                  {customerName.trim().length > 1 && (
                    <div className="ml-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </div>
                  )}
                </div>
              )}

              {/* Ação principal fixa no rodapé: acende quando o passo está completo */}
              <div className="sticky bottom-0 -mx-5 sm:-mx-6 flex items-center gap-2 border-t border-slate-100 bg-white px-5 sm:px-6 pt-3 pb-1">
                <button
                  type="button"
                  aria-label="Voltar para a sacola"
                  onClick={() => {
                    setIsCheckoutStepOpen(false)
                    setIsCartModalOpen(true)
                  }}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  disabled={!canAdvanceIdentification}
                  onClick={handleAdvanceIdentification}
                  className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl text-sm font-black transition-all ${
                    canAdvanceIdentification
                      ? 'bg-emerald-800 text-white shadow-lg ring-4 ring-emerald-500/25 hover:bg-emerald-900 active:scale-[0.98]'
                      : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  <span>Continuar</span>
                  <ChevronRight className="h-4 w-4 stroke-[3]" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ============================================================ */}
          {/* ETAPA 3: ENDEREÇO DE ENTREGA (DELIVERY) - FIEL AO STITCH     */}
          {/* ============================================================ */}
          {checkoutWizardStep === 3 && fulfillmentType === 'DELIVERY' && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4 py-2 text-sm"
            >
              {showSavedAddressList ? (
                /* Cliente com cadastro: escolhe um endereço salvo (1 toque) */
                <div className="space-y-2.5">
                  {savedAddresses.map((addr: any, i: number) => {
                    const isSel =
                      !!street && street === (addr.street || '') && number === (addr.number ? String(addr.number) : '')
                    const outOfArea =
                      isStrictNeighborhoods &&
                      availableNeighborhoodsList.length > 0 &&
                      !matchNeighborhoodWithConfig(addr.neighborhood || '')
                    return (
                      <button
                        key={addr.id || i}
                        type="button"
                        onClick={() => selectSavedAddress(addr)}
                        className={`flex w-full items-center gap-3 rounded-2xl border-2 px-3.5 py-3.5 text-left transition-all active:scale-[0.99] ${
                          isSel
                            ? 'border-emerald-600 bg-emerald-50'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                            isSel ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {isSel ? <Check className="h-4 w-4 stroke-[3]" /> : <MapPin className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-base font-black text-slate-950">
                            {addr.street ? `${addr.street}, ${addr.number || 's/n'}` : `Endereço ${i + 1}`}
                          </div>
                          <div className="truncate text-sm font-medium text-slate-500">
                            {[addr.neighborhood, addr.complement].filter(Boolean).join(' · ')}
                          </div>
                        </div>
                        {outOfArea && (
                          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                            Fora da área
                          </span>
                        )}
                      </button>
                    )
                  })}

                  <button
                    type="button"
                    onClick={startNewAddress}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 py-3.5 text-sm font-black text-emerald-800 transition-colors hover:bg-emerald-50"
                  >
                    <Plus className="h-4 w-4 stroke-[3]" />
                    Novo endereço
                  </button>
                </div>
              ) : (
                /* Sem cadastro (ou novo endereço): CEP primeiro, depois o resto */
                <div className="space-y-3.5">
                  <div>
                    <div className="flex items-center justify-between pb-1.5">
                      <label htmlFor="zipcode-input" className={addrLabelCls + ' !pb-0'}>
                        CEP
                      </label>
                      {!showAddressFields && (
                        <button
                          type="button"
                          onClick={() => setIsManualAddressMode(true)}
                          className="text-sm font-bold text-emerald-700 hover:text-emerald-900"
                        >
                          Não sei meu CEP
                        </button>
                      )}
                    </div>
                    <div className="relative flex items-center">
                      <input
                        ref={cepInputRef}
                        id="zipcode-input"
                        type="text"
                        inputMode="numeric"
                        autoComplete="postal-code"
                        placeholder="00000-000"
                        value={zipcode}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 8)
                          setZipcode(val.length > 5 ? `${val.slice(0, 5)}-${val.slice(5)}` : val)
                          if (val.length === 8) handleSearchCEPCheckout(val)
                        }}
                        className={addrInputCls + ' pr-12'}
                      />
                      <div className="absolute right-3 flex items-center">
                        {isSearchingCEPCheckout ? (
                          <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                        ) : street && zipDigits.length === 8 ? (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-700 text-white">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {showAddressFields && (
                    <>
                      <div>
                        <label htmlFor="checkout-street-input" className={addrLabelCls}>
                          Rua / Avenida
                        </label>
                        <input
                          id="checkout-street-input"
                          type="text"
                          autoComplete="street-address"
                          placeholder="Ex: Rua das Flores"
                          value={street}
                          onChange={(e) => setStreet(e.target.value)}
                          className={addrInputCls}
                        />
                      </div>

                      <div className="grid grid-cols-5 gap-3">
                        <div className="col-span-2">
                          <label htmlFor="checkout-number-input" className={addrLabelCls}>
                            Número
                          </label>
                          <input
                            id="checkout-number-input"
                            type="text"
                            inputMode="numeric"
                            placeholder="Nº"
                            value={number}
                            onChange={(e) => setNumber(e.target.value)}
                            className={addrInputCls}
                          />
                        </div>
                        <div className="col-span-3">
                          <label htmlFor="checkout-complement-input" className={addrLabelCls}>
                            Complemento <span className="font-medium text-slate-400">(opcional)</span>
                          </label>
                          <input
                            id="checkout-complement-input"
                            type="text"
                            placeholder="Apto 42, Bloco B"
                            value={complement}
                            onChange={(e) => setComplement(e.target.value)}
                            className={addrInputCls}
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="checkout-neighborhood-input" className={addrLabelCls}>
                          Bairro
                        </label>
                        {availableNeighborhoodsList.length > 0 ? (
                          <>
                            <select
                              id="checkout-neighborhood-input"
                              value={neighborhood}
                              onChange={(e) => {
                                setNeighborhood(e.target.value)
                                setUnservedNeighborhood(null)
                              }}
                              className={addrInputCls}
                            >
                              <option value="">Selecione seu bairro</option>
                              {availableNeighborhoodsList.map((n) => (
                                <option key={n} value={n}>
                                  {n} · {feeLabelForNeighborhood(n)}
                                </option>
                              ))}
                              {neighborhood && !availableNeighborhoodsList.includes(neighborhood) && (
                                <option value={neighborhood}>
                                  {neighborhood} · {feeLabelForNeighborhood(neighborhood)}
                                </option>
                              )}
                            </select>
                          </>
                        ) : (
                          <input
                            id="checkout-neighborhood-input"
                            type="text"
                            placeholder="Seu bairro"
                            value={neighborhood}
                            onChange={(e) => setNeighborhood(e.target.value)}
                            className={addrInputCls}
                          />
                        )}
                      </div>

                      <div>
                        <label htmlFor="checkout-reference-input" className={addrLabelCls}>
                          Ponto de referência <span className="font-medium text-slate-400">(opcional)</span>
                        </label>
                        <input
                          id="checkout-reference-input"
                          type="text"
                          placeholder="Ex: Próximo à padaria, portão cinza"
                          value={referencePoint}
                          onChange={(e) => setReferencePoint(e.target.value)}
                          className={addrInputCls}
                        />
                      </div>
                    </>
                  )}

                  {savedAddresses.length > 0 && (
                    <button
                      type="button"
                      onClick={backToSavedAddresses}
                      className="text-sm font-bold text-emerald-700 hover:text-emerald-900"
                    >
                      Usar um endereço salvo
                    </button>
                  )}
                </div>
              )}

              {/* Bairro que a loja não atende (só na política STRICT) */}
              {unservedNeighborhood !== null && !neighborhood && (
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-amber-50 px-4 py-3">
                  <span className="text-sm font-bold text-amber-900">
                    Não entregamos em {unservedNeighborhood || 'esse bairro'}
                  </span>
                  <button
                    type="button"
                    onClick={switchToTakeout}
                    className="shrink-0 text-sm font-black text-emerald-800 hover:text-emerald-900"
                  >
                    Retirar no balcão
                  </button>
                </div>
              )}

              {/* Taxa e tempo: só quando o endereço está completo */}
              {isAddressValid && (
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
                    <Bike className="h-5 w-5 shrink-0 text-emerald-700" />
                    Entrega ·{' '}
                    {matchedSector?.estimatedTimeMin
                      ? `${matchedSector.estimatedTimeMin}–${matchedSector.estimatedTimeMax || 50} min`
                      : '35–50 min'}
                  </span>
                  <span className="text-lg font-black text-slate-950">
                    {parseDeliveryFee(deliveryFee) === 0 ? 'Grátis' : formatCurrency(deliveryFee)}
                  </span>
                </div>
              )}

              {/* Ação principal fixa no rodapé: acende quando o endereço está completo */}
              <div className="sticky bottom-0 -mx-5 sm:-mx-6 flex items-center gap-2 border-t border-slate-100 bg-white px-5 sm:px-6 pt-3 pb-1">
                <button
                  type="button"
                  aria-label="Voltar para os dados"
                  onClick={() => setCheckoutWizardStep(2)}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  disabled={!isAddressValid}
                  onClick={() => {
                    if (!isAddressValid) return
                    setCheckoutWizardStep(4)
                    setGpsTriggerNonce((prev) => prev + 1)
                  }}
                  className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl text-sm font-black transition-all ${
                    isAddressValid
                      ? 'bg-emerald-800 text-white shadow-lg ring-4 ring-emerald-500/25 hover:bg-emerald-900 active:scale-[0.98]'
                      : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  <span>Continuar</span>
                  <ChevronRight className="h-4 w-4 stroke-[3]" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ============================================================ */}
          {/* ETAPA 4: AJUSTE FINO NO MAPA (ETAPA OPCIONAL)                */}
          {/* ============================================================ */}
          {checkoutWizardStep === 4 && fulfillmentType === 'DELIVERY' && (
            <motion.div
              key="step4-map"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="py-1 text-sm"
            >

              {/* AJUSTE FINO NO MAPA (ETAPA OPCIONAL - FIEL À IMAGEM 3) */}

                <div className="space-y-3.5 py-1">
                  {/* CABEÇALHO SUPERIOR FIEL AO MOCKUP (IMAGEM 3) */}
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCheckoutWizardStep(3)}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all active:scale-95"
                      title="Voltar para editar endereço"
                    >
                      <X className="h-4 w-4 stroke-[2.5]" />
                    </button>

                    <span className="rounded-full bg-slate-100/90 border border-slate-200/80 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-slate-600">
                      ETAPA OPCIONAL
                    </span>

                    <button
                      type="button"
                      onClick={() => setCheckoutWizardStep(5)}
                      className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors px-1.5 py-1"
                    >
                      Pular
                    </button>
                  </div>

                  {/* TÍTULO E SUBTÍTULO */}
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                      Ajuste fino no mapa
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                      Arraste o mapa para apontar com precisão onde fica o portão ou entrada.
                    </p>
                  </div>

                  {/* MAPA INTERATIVO REAL COM ALVO VERDE E CONTROLES FLUTUANTES (IMAGEM 3) */}
                  <CheckoutAddressMap
                    street={street}
                    number={number}
                    neighborhood={neighborhood}
                    city={city || profile?.city || 'Caraguatatuba'}
                    zipcode={zipcode}
                    savedAddresses={savedAddresses}
                    gpsTriggerNonce={gpsTriggerNonce}
                    onCoordinatesChange={(coords) => setDeliveryCoords(coords)}
                    onAddressResolved={(resolved) => {
                      if (resolved.street && (!street || street.trim().length < 3)) {
                        setStreet(resolved.street)
                      }
                      if (resolved.number && !number) {
                        setNumber(resolved.number)
                      }
                      if (resolved.neighborhood) {
                        const matched = matchNeighborhoodWithConfig(resolved.neighborhood)
                        if (matched) setNeighborhood(matched)
                      }
                      if (resolved.zipcode && !zipcode) {
                        setZipcode(formatCep(resolved.zipcode.replace(/\D/g, '')))
                      }
                    }}
                    onSelectSavedAddress={(addr) => {
                      setStreet(addr.street || '')
                      setNumber(addr.number || '')
                      setNeighborhood(addr.neighborhood || '')
                      setComplement(addr.complement || '')
                      setReferencePoint(addr.referencePoint || '')
                      if (addr.zipcode) {
                        setZipcode(formatCep(addr.zipcode.toString().padStart(8, '0')))
                      }
                    }}
                  />

                  {/* BOTTOM SHEET CARD (FIEL À IMAGEM 3 DO STITCH) */}
                  <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                        <Home className="h-5 w-5 stroke-[2.2]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                          ENDEREÇO DE ENTREGA <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                        </span>
                        <h4 className="text-sm sm:text-base font-black text-slate-900 truncate mt-0.5">
                          {street ? `${street}, ${number || 'S/N'}` : 'Endereço Principal'}
                        </h4>
                        <p className="text-xs text-slate-500 font-medium truncate">
                          {neighborhood || city || profile?.city || 'Local'} • Ponto ajustável
                        </p>
                      </div>
                    </div>

                    {/* CHIPS DE OUTROS ENDEREÇOS SALVOS CASO HAJA MAIS DE UM */}
                    {savedAddresses && savedAddresses.length > 1 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-xs font-bold text-slate-500 block">
                          Trocar para outro salvo:
                        </span>
                        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                          {savedAddresses.map((addr: any, i: number) => {
                            const isSel = street === addr.street && number === addr.number
                            return (
                              <button
                                key={i}
                                type="button"
                                onClick={() => {
                                  setStreet(addr.street || '')
                                  setNumber(addr.number || '')
                                  setNeighborhood(addr.neighborhood || '')
                                  setComplement(addr.complement || '')
                                  setReferencePoint(addr.referencePoint || addr.reference_point || '')
                                  if (addr.zipcode) {
                                    setZipcode(formatCep(addr.zipcode.toString().padStart(8, '0')))
                                  }
                                }}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap border transition-all flex items-center gap-1.5 ${
                                  isSel
                                    ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                                    : 'border-slate-200 bg-slate-50/80 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <MapPin className="h-3.5 w-3.5" />
                                <span>{addr.street ? `${addr.street.split(' ')[0]} ${addr.street.split(' ')[1] || ''}, ${addr.number}` : `Endereço ${i + 1}`}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* BOTÃO PRINCIPAL: CONFIRMAR LOCALIZAÇÃO */}
                    <button
                      type="button"
                      onClick={() => setCheckoutWizardStep(5)}
                      className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-sm sm:text-base font-black text-white shadow-lg shadow-emerald-700/20 transition-all active:scale-[0.98] bg-emerald-600 hover:bg-emerald-700"
                    >
                      <span>Confirmar Localização</span>
                      <Check className="h-4 w-4 stroke-[3]" />
                    </button>

                    {/* LINK SECUNDÁRIO: CONTINUAR SEM AJUSTAR PINO */}
                    <div className="text-center pt-0.5">
                      <button
                        type="button"
                        onClick={() => setCheckoutWizardStep(5)}
                        className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors py-1"
                      >
                        Continuar sem ajustar pino
                      </button>
                    </div>
                  </div>
                </div>
            </motion.div>
          )}

          {checkoutWizardStep === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4 py-2 text-sm"
            >
              {/* Formas de pagamento habilitadas na loja */}
              <div className="space-y-2.5">
                {paymentOptions.map((opt) => {
                  const selected = paymentMethod === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPaymentMethod(opt.value)}
                      className={`w-full flex items-center justify-between rounded-2xl border-2 p-4 text-left transition-all ${
                        selected
                          ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-600/30'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className={`hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl min-[400px]:flex ${opt.tint}`}>
                          <opt.Icon className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                          <span className="block break-words text-base font-black leading-snug text-slate-900">{opt.title}</span>
                          <p className="mt-0.5 break-words text-sm leading-snug text-slate-600">{opt.desc}</p>
                        </div>
                      </div>
                      <div
                        className={`ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all ${
                          selected ? 'bg-emerald-700 text-white' : 'border-2 border-slate-300'
                        }`}
                      >
                        {selected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Pix: o pagamento não é confirmado automaticamente, então o passo a passo é explícito */}
              {paymentMethod === 'PIX' && (
                <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col items-center gap-3">
                    <div className="text-center">
                      <span className="block text-sm font-semibold text-slate-500">Valor do Pix</span>
                      <span className="text-3xl font-black text-slate-950">{formatCurrency(cartTotal)}</span>
                    </div>
                    {pixQrDataUrl && (
                      <img
                        src={pixQrDataUrl}
                        alt="QR Code Pix"
                        className="h-48 w-48 rounded-2xl border border-slate-100 bg-white object-contain p-2"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => handleCopyPixKey(pixBRCodePayload)}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-black text-white shadow-md transition-all hover:bg-slate-800 active:scale-[0.98]"
                    >
                      {isCopiedPix ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                      <span>{isCopiedPix ? 'Código copiado' : 'Copiar código Pix'}</span>
                    </button>
                  </div>

                  <ol className="space-y-2.5">
                    {[
                      'Pague no app do seu banco com o QR Code ou o código copiado.',
                      'Volte aqui e toque em "Confirmar e enviar comprovante".',
                      'Anexe o comprovante na conversa do WhatsApp que vai abrir.',
                    ].map((text, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-800">
                          {i + 1}
                        </span>
                        <span className="text-sm font-semibold leading-snug text-slate-700">{text}</span>
                      </li>
                    ))}
                  </ol>

                  <div className="flex items-start gap-2 rounded-2xl bg-amber-50 px-3.5 py-3 text-sm font-bold text-amber-900">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>Seu pedido só é liberado depois que recebermos o comprovante.</span>
                  </div>
                </div>
              )}

              {/* Troco em dinheiro */}
              {paymentMethod === 'CASH' && fulfillmentType === 'DELIVERY' && (
                <div className="space-y-2.5 rounded-3xl border border-slate-200 bg-white p-4">
                  <label className="block text-sm font-bold text-slate-800">Precisa de troco para quanto?</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Não preciso', '50,00', '100,00'].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setChangeAmount(v)}
                        className={`rounded-xl border py-2.5 text-sm font-bold transition-all ${
                          changeAmount === v
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {v === 'Não preciso' ? v : `R$ ${v}`}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Ou digite o valor (ex: 70,00)"
                    value={changeAmount === 'Não preciso' ? '' : changeAmount}
                    onChange={(e) => setChangeAmount(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-base font-medium text-slate-900"
                  />
                </div>
              )}

              {/* Resumo dos valores */}
              <div className="space-y-2 rounded-2xl bg-slate-50 p-4 text-sm">
                <div className="flex items-center justify-between font-semibold text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-bold text-slate-800">{formatCurrency(cartSubtotal)}</span>
                </div>
                <div className="flex items-center justify-between font-semibold text-slate-600">
                  <span>Entrega</span>
                  <span className="font-bold text-slate-800">
                    {fulfillmentType === 'TAKEOUT' || parseDeliveryFee(deliveryFee) === 0 ? 'Grátis' : formatCurrency(deliveryFee)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                  <span className="text-base font-black text-slate-900">Total</span>
                  <span className="text-2xl font-black text-emerald-800">{formatCurrency(cartTotal)}</span>
                </div>
              </div>

              {/* Ação principal fixa no rodapé */}
              <div className="sticky bottom-0 -mx-5 sm:-mx-6 flex items-center gap-2 border-t border-slate-100 bg-white px-5 sm:px-6 pt-3 pb-1">
                <button
                  type="button"
                  aria-label="Voltar"
                  onClick={() => setCheckoutWizardStep(fulfillmentType === 'TAKEOUT' ? 2 : 3)}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  disabled={isSubmittingOrder || !paymentMethod}
                  onClick={handleFinalizeOrder}
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-800 text-sm font-black text-white shadow-lg ring-4 ring-emerald-500/25 transition-all hover:bg-emerald-900 active:scale-[0.98] disabled:opacity-60 disabled:ring-0"
                >
                  {isSubmittingOrder ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Enviando pedido...</span>
                    </>
                  ) : (
                    <>
                      <span>{paymentMethod === 'PIX' ? 'Confirmar e enviar comprovante' : 'Confirmar pedido'}</span>
                      <Rocket className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* ============================================================ */}
          {/* ETAPA 5: PEDIDO CONCLUÍDO / ACOMPANHAMENTO AO VIVO          */}
          {/* ============================================================ */}
          {checkoutWizardStep === 6 && (
            <motion.div
              key="step6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="py-4 text-center text-sm"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <h3 className="mt-3 text-xl font-black text-slate-900">Pedido realizado!</h3>

              {/* Acompanhamento do pedido (a lógica de status/polling fica no efeito acima; aqui só a apresentação) */}
              {(() => {
                const isTakeoutOrder = fulfillmentType === 'TAKEOUT'
                const s = (liveOrderStatus || '').toLowerCase().trim()

                let currentStage = 1
                let statusLabel = 'Aguardando Confirmação'
                let StatusIconComponent = Clock
                let iconColorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200'

                if (s === 'delivered' || s === 'completed' || s === 'finalizado') {
                  currentStage = 5
                  statusLabel = isTakeoutOrder ? 'Pedido Retirado / Concluído 🎉' : 'Pedido Entregue / Finalizado 🎉'
                  StatusIconComponent = Check
                  iconColorClasses = 'bg-emerald-100 text-emerald-800 border-emerald-300'
                } else if (s === 'dispatched' || s === 'delivering' || s === 'em_rota') {
                  currentStage = 4
                  statusLabel = isTakeoutOrder ? 'Pronto no Balcão para Retirada! 🛍️' : 'Saiu para Entrega 🛵'
                  StatusIconComponent = isTakeoutOrder ? ShoppingBag : Rocket
                  iconColorClasses = 'bg-purple-100 text-purple-800 border-purple-300'
                } else if (s === 'ready' || s === 'pronto') {
                  currentStage = 4
                  statusLabel = isTakeoutOrder ? 'Pronto no Balcão para Retirada! 🛍️' : 'Pronto para Expedição 📦'
                  StatusIconComponent = CheckCircle2
                  iconColorClasses = 'bg-teal-100 text-teal-800 border-teal-300'
                } else if (s === 'conferencia' || s === 'conferência' || s === 'conference') {
                  currentStage = 3
                  statusLabel = 'Em Conferência e Embalagem 📋'
                  StatusIconComponent = ClipboardCheck
                  iconColorClasses = 'bg-blue-100 text-blue-800 border-blue-300'
                } else if (s === 'in_preparation' || s === 'in_production' || s === 'preparing' || s === 'producao') {
                  currentStage = 2
                  statusLabel = 'Na Cozinha em Preparo 👨‍🍳'
                  StatusIconComponent = ChefHat
                  iconColorClasses = 'bg-orange-100 text-orange-800 border-orange-300'
                }

                // 5 etapas: 1. Aguardando, 2. Produção, 3. Conferência, 4. Na Rua / Balcão, 5. Entregue / Retirado
                const stagesList = [
                  { num: 1, label: 'Aguardando' },
                  { num: 2, label: 'Produção' },
                  { num: 3, label: 'Conferência' },
                  { num: 4, label: isTakeoutOrder ? 'No Balcão' : 'Na Rua' },
                  { num: 5, label: isTakeoutOrder ? 'Retirado' : 'Entregue' }
                ]

                return (
                  <div className="mt-4 space-y-3">
                    <div className="space-y-4 rounded-3xl border-2 border-emerald-300/80 bg-white p-4 text-left shadow-sm sm:p-5">
                      {/* Status atual (o ponto pulsante indica que atualiza sozinho) */}
                      <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-white p-3.5">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${iconColorClasses}`}>
                            <StatusIconComponent className="h-6 w-6 stroke-[2.2]" />
                          </div>
                          <div className="min-w-0">
                            <span className="mb-1 block text-xs font-black uppercase leading-none tracking-wider text-slate-400">
                              Status atual
                            </span>
                            <span className="flex items-center gap-2 text-base font-black leading-tight text-slate-900">
                              <span className="truncate">{statusLabel}</span>
                              {currentStage < 5 && (
                                <span className="relative flex h-2.5 w-2.5 shrink-0">
                                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                        <span className="shrink-0 rounded-full bg-slate-900 px-3 py-0.5 text-xs font-black text-white">
                          #{createdDisplayId || 1}
                        </span>
                      </div>

                      {/* Progresso */}
                      <div className="space-y-2.5 pt-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                            Progresso do pedido
                          </span>
                          <span className="text-xs font-black text-emerald-700">Etapa {currentStage} de 5</span>
                        </div>

                        <div className="py-2">
                          <div className="relative flex items-center justify-between">
                            <div className="absolute left-4 right-4 top-4 z-0 h-1 -translate-y-1/2 bg-slate-200" />
                            <div
                              className="absolute left-4 top-4 z-0 h-1 -translate-y-1/2 bg-emerald-600 transition-all duration-500"
                              style={{
                                width: `${((Math.min(currentStage, 5) - 1) / 4) * 100}%`,
                                maxWidth: 'calc(100% - 32px)'
                              }}
                            />

                            {stagesList.map((st) => {
                              const isPassed = currentStage > st.num
                              const isCurrent = currentStage === st.num
                              const isCompletedOrActive = isPassed || isCurrent

                              return (
                                <div key={st.num} className="relative z-10 flex flex-col items-center gap-1.5">
                                  <div
                                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black transition-all ${
                                      isCompletedOrActive
                                        ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                                        : 'border border-slate-200 bg-slate-100 text-slate-400'
                                    } ${isCurrent && st.num < 5 ? 'animate-pulse' : ''}`}
                                  >
                                    {isPassed ? <Check className="h-4 w-4 stroke-[3]" /> : st.num}
                                  </div>
                                  <span
                                    className={`text-center text-xs leading-tight ${
                                      isCompletedOrActive ? 'font-black text-slate-900' : 'font-medium text-slate-400'
                                    } ${isCurrent ? '' : 'hidden min-[430px]:block'}`}
                                  >
                                    {st.label}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Aviso curto e discreto */}
                      <p className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                        <Info className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                        Mantenha esta janela aberta para acompanhar.
                      </p>
                    </div>

                    {/* Resumo do pedido: toque para conferir itens, complementos e observações */}
                    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white text-left shadow-xs">
                      <button
                        type="button"
                        onClick={() => setIsOrderItemsOpen((v) => !v)}
                        aria-expanded={isOrderItemsOpen}
                        className="flex w-full items-center justify-between gap-3 p-3.5 text-left"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xs font-black text-slate-800">
                            {lastOrderItemsCount}x
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black leading-tight text-slate-900">
                              {isOrderItemsOpen ? 'Seu pedido' : `${lastOrderItemsCount} ${lastOrderItemsCount === 1 ? 'item' : 'itens'} · ver detalhes`}
                            </p>
                            <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
                              Previsão: {isTakeoutOrder ? '15–25 min' : '30–45 min'}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-base font-black text-slate-900">{formatCurrency(lastOrderTotal)}</span>
                          <ChevronRight
                            className={`h-4 w-4 text-slate-400 transition-transform ${isOrderItemsOpen ? 'rotate-90' : ''}`}
                          />
                        </div>
                      </button>

                      {isOrderItemsOpen && (
                        <ul className="space-y-3 border-t border-slate-100 px-3.5 py-3">
                          {lastOrderItems.map((item) => (
                            <li key={item.id} className="text-sm">
                              <div className="flex items-start justify-between gap-3">
                                <span className="font-bold text-slate-900">
                                  {item.quantity}x {item.displayName || item.product.name}
                                </span>
                                <span className="shrink-0 font-semibold text-slate-700">
                                  {formatCurrency(item.unitPrice * item.quantity)}
                                </span>
                              </div>
                              {item.fractions && item.fractions.length > 0 && (
                                <p className="text-xs text-slate-500">{item.fractions.join(' + ')}</p>
                              )}
                              {item.selectedOptions?.map((opt, i) => (
                                <p key={i} className="text-xs text-slate-500">
                                  + {opt.quantity > 1 ? `${opt.quantity}x ` : ''}
                                  {opt.optionName}
                                </p>
                              ))}
                              {item.observation && (
                                <p className="text-xs italic text-slate-500">“{item.observation}”</p>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )
              })()}

              {/* Ação sugerida no WhatsApp (mesma mensagem do pedido) */}
              {lastOrderText && (
                <div className="sticky bottom-0 -mx-5 mt-4 border-t border-slate-100 bg-white px-5 pb-1 pt-3 sm:-mx-6 sm:px-6">
                  <button
                    type="button"
                    onClick={() => {
                      const phone = profile?.whatsappNumber || profile?.whatsapp_number || ''
                      const url = `https://api.whatsapp.com/send?phone=${phone.replace(/\D/g, '')}&text=${encodeURIComponent(lastOrderText)}`
                      window.open(url, '_blank')
                    }}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-800 text-sm font-black text-white shadow-lg ring-4 ring-emerald-500/25 transition-all hover:bg-emerald-900 active:scale-[0.98]"
                  >
                    <MessageCircle className="h-5 w-5" />
                    <span>{paymentMethod === 'PIX' ? 'Enviar comprovante do Pix' : 'Fale conosco e confirme seu pedido'}</span>
                  </button>
                </div>
              )}
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
                  <span className="flex items-center gap-2 text-slate-500">
                    {feeLabelForNeighborhood(bairro)}
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </span>
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
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-black uppercase text-primary">
                          Principal
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-slate-600">
                      {addr.neighborhood} - {addr.city}/{addr.state}
                    </p>
                    {addr.zipcode && (
                      <p className="text-xs text-slate-400">
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
