'use client'
import React, { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bike,
  CheckCircle2,
  ChefHat,
  Clock,
  DollarSign,
  MapPin,
  PackageCheck,
  Phone,
  Receipt,
  User,
  X,
  AlertTriangle,
  Flame,
  Navigation,
  CreditCard,
  Banknote,
  Sparkles,
  ExternalLink,
  MessageCircle,
  CupSoda,
  CheckSquare,
  Square,
  Send,
  Calculator,
  TrendingUp,
  Layers,
  MapPinned,
  Copy,
  ChevronDown,
  ChevronUp,
  Route,
  ArrowUp,
  ArrowDown,
  Compass,
  ListOrdered,
  Check,
  Plus,
  Trash2
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/axios'

interface DeliveryOrdersDrawerProps {
  open: boolean
  onClose: () => void
  initialTab?: 'pending' | 'in_preparation' | 'dispatched' | 'delivered'
  orders: any[]
  profile?: any
  sessionId?: string
  onOrderCompleted?: () => void
}

// Cache de coordenadas em memória
const coordsCache: Record<string, [number, number] | null> = {}

export function DeliveryOrdersDrawer({
  open,
  onClose,
  initialTab = 'pending',
  orders,
  profile,
  sessionId,
  onOrderCompleted
}: DeliveryOrdersDrawerProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'in_preparation' | 'dispatched' | 'delivered'>(initialTab)
  const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState<number>(Date.now())
  const [checkedDrinks, setCheckedDrinks] = useState<Record<string, boolean>>({})

  // Controle de cards colapsados na Produção (por padrão carregam colapsados/resumidos em 2 linhas)
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<string, boolean>>({})

  // Multi-seleção de pedidos na Produção para montagem de rota
  const [selectedOrderIdsForRoute, setSelectedOrderIdsForRoute] = useState<string[]>([])

  // Motoboys do Turno salvos no LocalStorage
  const [shiftMotoboys, setShiftMotoboys] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('delivery_shift_motoboys')
        return saved ? JSON.parse(saved) : []
      } catch (e) {
        return []
      }
    }
    return []
  })
  const [newMotoboyInput, setNewMotoboyInput] = useState('')

  // Modal de Construção de Rota & Despacho em Lote
  const [routeModalOpen, setRouteModalOpen] = useState(false)
  const [routeOrders, setRouteOrders] = useState<any[]>([])
  const [routeDriver, setRouteDriver] = useState<string>('')
  const [customRouteDriver, setCustomRouteDriver] = useState<string>('')
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false)
  const [isDispatchingBatch, setIsDispatchingBatch] = useState(false)
  const [routeStats, setRouteStats] = useState<{
    totalDistanceKm: number
    totalDurationMin: number
    legs: {
      from: string
      to: string
      distanceKm: number
      durationMin: number
      sameAddress?: boolean
    }[]
  } | null>(null)

  // Modal de Despacho Individual com Motoboy
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false)
  const [orderToDispatch, setOrderToDispatch] = useState<any | null>(null)
  const [selectedDriver, setSelectedDriver] = useState<string>('')
  const [customDriverName, setCustomDriverName] = useState<string>('')

  // Atualiza o relógio a cada 10 segundos
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 10000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (open && initialTab) {
      setActiveTab(initialTab)
    }
  }, [open, initialTab])

  // Limpa seleções de rota ao trocar de aba
  useEffect(() => {
    if (activeTab !== 'in_preparation') {
      setSelectedOrderIdsForRoute([])
    }
  }, [activeTab])

  // Salva motoboys do turno no localStorage
  const saveShiftMotoboys = (list: string[]) => {
    setShiftMotoboys(list)
    if (typeof window !== 'undefined') {
      localStorage.setItem('delivery_shift_motoboys', JSON.stringify(list))
    }
  }

  const handleAddShiftMotoboy = (nameToAdd?: string) => {
    const name = (nameToAdd || newMotoboyInput).trim()
    if (!name) return
    if (!shiftMotoboys.includes(name)) {
      const updated = [...shiftMotoboys, name]
      saveShiftMotoboys(updated)
      setRouteDriver(name)
      setSelectedDriver(name)
      toast.success(`Motoboy ${name} adicionado ao turno!`)
    }
    setNewMotoboyInput('')
    setCustomRouteDriver('')
    setCustomDriverName('')
  }

  const handleRemoveShiftMotoboy = (name: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const updated = shiftMotoboys.filter((m) => m !== name)
    saveShiftMotoboys(updated)
    if (routeDriver === name) setRouteDriver(updated[0] || '')
    if (selectedDriver === name) setSelectedDriver(updated[0] || '')
  }

  const pendingOrders = orders.filter((o) => o.status === 'pending')
  const inPrepOrders = orders.filter((o) => o.status === 'in_preparation')
  const dispatchedOrders = orders.filter((o) => o.status === 'dispatched')
  const deliveredOrders = orders.filter((o) => o.status === 'delivered')

  const currentList =
    activeTab === 'pending'
      ? pendingOrders
      : activeTab === 'in_preparation'
      ? inPrepOrders
      : activeTab === 'dispatched'
      ? dispatchedOrders
      : deliveredOrders

  // Detecta se um item é bebida/geladeira por palavras-chave
  const isDrinkItem = (name: string) => {
    const n = name.toLowerCase()
    return (
      n.includes('coca') ||
      n.includes('guaraná') ||
      n.includes('guarana') ||
      n.includes('suco') ||
      n.includes('água') ||
      n.includes('agua') ||
      n.includes('cerveja') ||
      n.includes('refrigerante') ||
      n.includes('fanta') ||
      n.includes('sprite') ||
      n.includes('tonica') ||
      n.includes('h2o') ||
      n.includes('heineken') ||
      n.includes('budweiser') ||
      n.includes('red bull') ||
      n.includes('monster') ||
      n.includes('long neck') ||
      n.includes('lata') ||
      n.includes('600ml') ||
      n.includes('2l') ||
      n.includes('1l') ||
      n.includes('garrafa')
    )
  }

  // Agrupamento de pedidos por região/bairro na etapa de Produção
  const neighborhoodCountInPrep = useMemo(() => {
    const counts: Record<string, number> = {}
    inPrepOrders.forEach((o) => {
      const b = (o.neighborhood || '').trim().toLowerCase()
      if (b) {
        counts[b] = (counts[b] || 0) + 1
      }
    })
    return counts
  }, [inPrepOrders])

  // Endereço completo do Restaurante para cálculo de rota
  const restaurantFullAddress = useMemo(() => {
    if (profile?.restaurant_address && profile.restaurant_address !== 'Restaurante') {
      return profile.restaurant_address
    }
    const parts = [
      profile?.street ? `${profile.street}, ${profile.number || 'S/N'}` : null,
      profile?.neighborhood,
      profile?.city || profile?.trade_name || 'Restaurante'
    ].filter(Boolean)
    return parts.length > 0 ? parts.join(' - ') : 'Restaurante'
  }, [profile])

  // Badges rápidos operacionais para a etapa de Produção (colapsada ou expandida)
  const renderQuickProductionBadges = (order: any) => {
    const obs = (order.observations || '').trim().toLowerCase()
    const total = order.total_amount || 0
    const totalFmt = formatBRL(total)

    // 1. Detecção do Pagamento
    const isCartao = obs.includes('cartão') || obs.includes('cartao') || obs.includes('débito') || obs.includes('debito') || obs.includes('crédito') || obs.includes('credito')
    const isPix = obs.includes('pix')
    const isDinheiro = obs.includes('dinheiro') || (!isCartao && !isPix)

    let paymentBadge = null

    if (isPix) {
      paymentBadge = (
        <span
          className="inline-flex items-center gap-1 rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-black text-purple-900 border border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800 shrink-0"
          title="Pagamento via Pix: confirmar recebimento no extrato bancário"
        >
          <Sparkles className="h-3 w-3 text-purple-600 dark:text-purple-400" />
          <span>⚡ Pix (Confirmar)</span>
        </span>
      )
    } else if (isCartao) {
      const tipo = (obs.includes('débito') || obs.includes('debito'))
        ? 'Débito'
        : (obs.includes('crédito') || obs.includes('credito'))
          ? 'Crédito'
          : 'Cartão'
      paymentBadge = (
        <span
          className="inline-flex items-center gap-1 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-black text-blue-900 border border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 shrink-0"
          title={`Cobrar na entrega com a maquininha (${tipo})`}
        >
          <CreditCard className="h-3 w-3 text-blue-600 dark:text-blue-400" />
          <span>💳 Maquininha ({tipo})</span>
        </span>
      )
    } else if (isDinheiro) {
      let valorTrocoPara = null
      if (typeof order.change_for === 'number' && order.change_for > 0) {
        valorTrocoPara = order.change_for
      } else if (typeof order.valor_troco === 'number' && order.valor_troco > 0) {
        valorTrocoPara = order.valor_troco
      } else {
        const matchTroco = obs.match(/troco\s*(?:para|de|:)?\s*(?:r\$\s*)?([\d.,]+)/i)
        if (matchTroco && matchTroco[1]) {
          const raw = matchTroco[1].trim()
          if (!obs.includes('sem troco') || obs.includes('troco para') || obs.includes('troco de')) {
            const parsed = parseFloat(raw.replace(/\./g, '').replace(',', '.'))
            if (!isNaN(parsed) && parsed > 0) valorTrocoPara = parsed
          }
        }
      }

      if (valorTrocoPara !== null && valorTrocoPara > total) {
        const trocoDevolver = valorTrocoPara - total
        paymentBadge = (
          <span
            className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-black text-amber-950 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 shrink-0"
            title={`Cliente pagará com ${formatBRL(valorTrocoPara)}. Separar ${formatBRL(trocoDevolver)} de troco!`}
          >
            <Banknote className="h-3 w-3 text-amber-700 dark:text-amber-400" />
            <span>💵 Troco: {formatBRL(trocoDevolver)} (p/ {formatBRL(valorTrocoPara)})</span>
          </span>
        )
      } else {
        paymentBadge = (
          <span
            className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-950 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 shrink-0"
            title="Pagamento em dinheiro sem troco"
          >
            <Banknote className="h-3 w-3 text-amber-700 dark:text-amber-400" />
            <span>💵 Dinheiro (Sem troco)</span>
          </span>
        )
      }
    }

    // 2. Bebidas de geladeira
    const drinkItems = (order.items || []).filter((i: any) => isDrinkItem(i.name || ''))
    const drinkCount = drinkItems.reduce((acc: number, d: any) => acc + (d.quantity || 1), 0)

    // 3. Observações especiais
    const hasCustomObs = (order.observations || '')
      .split('|')
      .some((part: string) => {
        const trimmed = part.trim().toLowerCase()
        return (trimmed.startsWith('obs:') || trimmed.startsWith('ref:')) && !trimmed.includes('entrega (delivery)') && !trimmed.includes('retirada no balcão')
      }) || (order.items || []).some((i: any) => i.observation && i.observation.trim().length > 0)

    return (
      <>
        {/* Valor Total do Pedido */}
        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-950 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 shrink-0">
          💰 {totalFmt}
        </span>

        {/* Badge de Pagamento / Ação Operacional */}
        {paymentBadge}

        {/* Alerta de Geladeira */}
        {drinkCount > 0 && (
          <span
            className="inline-flex items-center gap-1 rounded bg-cyan-100 px-1.5 py-0.5 text-[10px] font-black text-cyan-950 border border-cyan-300 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800 shrink-0"
            title="Contém bebidas! Pegar na geladeira ao embalar."
          >
            <CupSoda className="h-3 w-3 text-cyan-700 dark:text-cyan-400" />
            <span>🥤 {drinkCount} Geladeira</span>
          </span>
        )}

        {/* Alerta de Obs */}
        {hasCustomObs && (
          <span
            className="inline-flex items-center gap-1 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-black text-rose-950 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800 shrink-0"
            title="O pedido possui observações personalizadas!"
          >
            💬 Com Obs
          </span>
        )}
      </>
    )
  }

  // Cálculo de SLA
  const getSlaInfo = (order: any) => {
    const createdMs = order.created_at ? new Date(order.created_at).getTime() : Date.now()
    const diffMin = Math.max(0, Math.floor((currentTime - createdMs) / 60000))

    let slaMin = 30
    let slaMax = 50

    if (profile?.delivery_sectors && Array.isArray(profile.delivery_sectors) && order.neighborhood) {
      const orderBairro = order.neighborhood.toLowerCase().trim()
      const foundSector = profile.delivery_sectors.find((s: any) =>
        s.neighborhoods?.some((n: string) => n.toLowerCase().trim() === orderBairro)
      )
      if (foundSector) {
        slaMin = Number(foundSector.estimatedTimeMin) || slaMin
        slaMax = Number(foundSector.estimatedTimeMax) || slaMax
      }
    } else if (profile?.delivery_time_min && profile?.delivery_time_max) {
      slaMin = Number(profile.delivery_time_min)
      slaMax = Number(profile.delivery_time_max)
    }

    if (diffMin < slaMin) {
      return {
        minutes: diffMin,
        text: `⏱️ ${diffMin} min (No prazo)`,
        variant: 'green',
        badgeBg: 'bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
      }
    } else if (diffMin <= slaMax) {
      return {
        minutes: diffMin,
        text: `⚠️ ${diffMin} min (${slaMax - diffMin}m p/ limite)`,
        variant: 'yellow',
        badgeBg: 'bg-amber-500/10 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
      }
    } else {
      return {
        minutes: diffMin,
        text: `🚨 Atrasado há ${diffMin - slaMax} min (${diffMin}m total)`,
        variant: 'red',
        badgeBg: 'bg-rose-500/10 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 animate-pulse'
      }
    }
  }

  // Cópia Segura para Área de Transferência
  const copyToClipboard = (text: string, label: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (!text) return
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
      toast.success(`${label} copiado!`)
    }
  }

  // Resumo Completo do Pedido para o PDV
  const copyFullOrderSummary = (order: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const itemsSummary = (order.items || []).map((i: any) => {
      let line = `${i.quantity}x ${i.name || 'Item'}`
      if (i.observation) line += `\n   Obs: ${i.observation}`
      if (Array.isArray(i.complements) && i.complements.length > 0) {
        line += `\n   Adicionais: ${i.complements.map((c: any) => `${c.quantity && c.quantity > 1 ? `${c.quantity}x ` : ''}${c.name}`).join(', ')}`
      }
      return line
    }).join('\n')

    const paymentInfo = getUnifiedPaymentBanner(order)
    const summary = [
      `=== PEDIDO #${order.display_id || '0'} ===`,
      `Cliente: ${order.client_name}`,
      order.client_phone ? `WhatsApp: ${order.client_phone}` : null,
      order.address ? `Endereço: ${order.address}${order.city && !order.address.includes(order.city) ? `, ${order.city}` : ''}` : null,
      `Pagamento: ${paymentInfo.mainText}`,
      order.observations ? `Observações: ${order.observations}` : null,
      `Total: ${formatBRL(order.total_amount || 0)}`,
      `\nITENS:\n${itemsSummary}`
    ].filter(Boolean).join('\n')

    if (navigator.clipboard) {
      navigator.clipboard.writeText(summary)
      toast.success(`Pedido #${order.display_id} completo copiado para o PDV!`)
    }
  }

  // Alerta Unificado de Pagamento + Valor
  const getUnifiedPaymentBanner = (order: any) => {
    const obs = (order.observations || '').trim()
    const total = order.total_amount || 0
    const totalFmt = formatBRL(total)
    const lowerObs = obs.toLowerCase()

    const isCartao = lowerObs.includes('cartão') || lowerObs.includes('cartao') || lowerObs.includes('débito') || lowerObs.includes('debito') || lowerObs.includes('crédito') || lowerObs.includes('credito')
    const isPix = lowerObs.includes('pix')
    const isDinheiro = lowerObs.includes('dinheiro') || (!isCartao && !isPix)

    if (isPix) {
      return {
        icon: <Sparkles className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400" />,
        mainText: `📱 ${totalFmt} — PIX (Aguardando Comprovante)`,
        subText: 'Solicitar comprovante ao cliente ou verificar crédito no App do Banco.',
        style: 'border-purple-200 bg-purple-50/80 text-purple-950 dark:border-purple-900/50 dark:bg-purple-950/30 dark:text-purple-200'
      }
    }

    if (isCartao) {
      const tipo = (lowerObs.includes('débito') || lowerObs.includes('debito'))
        ? 'Débito'
        : (lowerObs.includes('crédito') || lowerObs.includes('credito'))
          ? 'Crédito'
          : 'Cartão'
      return {
        icon: <CreditCard className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />,
        mainText: `💳 ${totalFmt} — Cartão de ${tipo} (Levar Maquininha)`,
        subText: 'Cobrar na entrega com a maquininha sem fio.',
        style: 'border-blue-200 bg-blue-50/90 text-blue-950 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200'
      }
    }

    if (isDinheiro) {
      let valorTrocoPara: number | null = null

      if (typeof order.change_for === 'number' && order.change_for > 0) {
        valorTrocoPara = order.change_for
      } else if (typeof order.valor_troco === 'number' && order.valor_troco > 0) {
        valorTrocoPara = order.valor_troco
      } else {
        const matchTroco = obs.match(/troco\s*(?:para|de|:)?\s*(?:r\$\s*)?([\d.,]+)/i)
        if (matchTroco && matchTroco[1]) {
          const rawMatch = matchTroco[1].trim()
          if (!lowerObs.includes('sem troco') || lowerObs.indexOf('troco para') !== -1 || lowerObs.indexOf('troco de') !== -1) {
            let parsedVal = 0
            if (rawMatch.includes(',') && rawMatch.includes('.')) {
              parsedVal = parseFloat(rawMatch.replace(/\./g, '').replace(',', '.'))
            } else if (rawMatch.includes(',')) {
              parsedVal = parseFloat(rawMatch.replace(',', '.'))
            } else {
              parsedVal = parseFloat(rawMatch)
            }
            if (!isNaN(parsedVal) && parsedVal > 0) {
              valorTrocoPara = parsedVal
            }
          }
        }
      }

      if (valorTrocoPara !== null && valorTrocoPara > 0) {
        const valorDevolver = Math.max(0, valorTrocoPara - total)
        return {
          icon: <Banknote className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />,
          mainText: `💵 ${totalFmt} — Dinheiro (Troco de ${formatBRL(valorDevolver)})`,
          subText: `Cliente pagará com ${formatBRL(valorTrocoPara)}. Não esqueça de separar ${formatBRL(valorDevolver)} de troco!`,
          style: 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200'
        }
      }

      return {
        icon: <Banknote className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />,
        mainText: `💵 ${totalFmt} — Dinheiro (Sem Troco)`,
        subText: 'Receber o valor exato no ato da entrega.',
        style: 'border-amber-200 bg-amber-50/70 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200'
      }
    }

    return {
      icon: <AlertTriangle className="h-4 w-4 shrink-0 text-slate-500" />,
      mainText: `💰 ${totalFmt} — Pagamento a Conferir`,
      subText: obs || 'Confirmar forma de cobrança com o cliente.',
      style: 'border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200'
    }
  }

  const handleUpdateStatus = async (orderId: string, nextStatus: string, deliveryMan?: string) => {
    setLoadingOrderId(orderId)
    try {
      await api.patch(`/public/orders/${orderId}/status`, {
        status: nextStatus,
        cashier_session_id: nextStatus === 'delivered' ? sessionId : undefined,
        delivery_man: deliveryMan
      })

      if (nextStatus === 'in_preparation') {
        toast.success('Pedido Aceito! Enviado para a produção.')
      } else if (nextStatus === 'dispatched') {
        toast.success('Pedido Despachado! Saiu em rota de entrega.')
        setDispatchModalOpen(false)
        setOrderToDispatch(null)
      } else if (nextStatus === 'delivered') {
        toast.success('Baixa confirmada! Venda lançada no caixa com sucesso.')
      }

      if (onOrderCompleted) onOrderCompleted()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.response?.data?.message || 'Erro ao atualizar status do pedido.')
    } finally {
      setLoadingOrderId(null)
    }
  }

  const openDispatch = (order: any) => {
    setOrderToDispatch(order)
    if (!selectedDriver && shiftMotoboys.length > 0) {
      setSelectedDriver(shiftMotoboys[0])
    }
    setDispatchModalOpen(true)
  }

  // =========================================================================
  // MONTAGEM DE ROTA & CÁLCULO INTELIGENTE E PRECISO (GPS / PHOTON / NOMINATIM)
  // =========================================================================
  const openRouteBuilder = () => {
    if (selectedOrderIdsForRoute.length === 0) {
      toast.error('Selecione ao menos 1 pedido para construir a rota!')
      return
    }
    const selected = inPrepOrders.filter((o) => selectedOrderIdsForRoute.includes(o.id))
    setRouteOrders(selected)
    if (!routeDriver && shiftMotoboys.length > 0) {
      setRouteDriver(shiftMotoboys[0])
    }
    setRouteModalOpen(true)
    calculateRouteDistanceAndTime(selected)
  }

  // Geocodificação Inteligente por Logradouro / Apelidos / Photon / Nominatim
  const geocodeAddressSmart = async (
    rawAddress: string,
    zip?: string,
    neighborhoodFallback?: string,
    cityFallback?: string
  ): Promise<[number, number] | null> => {
    const cleanAddr = (rawAddress || '').trim()
    const cleanCity = (cityFallback || profile?.city || 'Caraguatatuba').trim()
    const streetOnly = cleanAddr.split('-')[0].split(',')[0].trim()
    const cacheKey = `${cleanAddr}|${zip || ''}|${neighborhoodFallback || ''}|${cleanCity}`

    if (coordsCache[cacheKey] !== undefined) {
      return coordsCache[cacheKey]
    }

    try {
      // 1. Gera termos de busca inteligentes (incluindo apelidos conhecidos de ruas)
      const searchTerms: string[] = []
      if (cleanAddr) searchTerms.push(`${cleanAddr}, ${cleanCity}`)
      if (streetOnly) searchTerms.push(`${streetOnly}, ${cleanCity}`)

      const lowerStreet = streetOnly.toLowerCase()
      // Tatsuo Matsumoto é popularmente conhecida como Rua Nove / Capricórnio II em Caraguá
      if (lowerStreet.includes('tatsuo') || lowerStreet.includes('matsumoto')) {
        searchTerms.push(`Rua Nove, Capricórnio II, ${cleanCity}`)
        searchTerms.push(`Rua Nove, ${cleanCity}`)
        searchTerms.push(`Rua 9, ${cleanCity}`)
      }
      // Toyo Kamiyama / Restaurante Marujo
      if (lowerStreet.includes('toyo') || lowerStreet.includes('kamiyama')) {
        searchTerms.push(`Rua Toyo Kamiyama, ${cleanCity}`)
        searchTerms.push(`Av. Zenichi Kamiyama, ${cleanCity}`)
        searchTerms.push(`Balneário Copacabana, ${cleanCity}`)
      }

      // 2. Busca via Photon API (OpenStreetMap com suporte a ruas residenciais e números)
      for (const term of searchTerms) {
        try {
          const q = `${term}, Brasil`
          const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=3`)
          const data = await res.json()
          if (data?.features?.length > 0) {
            // Valida se o resultado pertence à mesma cidade e não é uma correspondência distante
            const match = data.features.find((f: any) => {
              const featCity = (f.properties?.city || f.properties?.county || '').toLowerCase()
              const featName = (f.properties?.name || '').toLowerCase()
              // Evita falso positivo tipo "Topolândia" quando buscando "Toyo"
              const searchedWords = term.toLowerCase().split(/[,\s]+/)
              const nameMatches = searchedWords.some((w) => w.length >= 4 && featName.includes(w)) || featName.includes('nove') || featName.includes('copacabana')
              return (!cleanCity || featCity.includes(cleanCity.toLowerCase())) && nameMatches
            })

            if (match) {
              const [lon, lat] = match.geometry.coordinates as [number, number]
              coordsCache[cacheKey] = [lon, lat]
              return [lon, lat]
            }
          }
        } catch (e) {}
      }

      // 3. Busca via Nominatim
      for (const term of searchTerms) {
        try {
          const q = `${term}, Brasil`
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
            { headers: { 'User-Agent': 'MetricsPDV/1.0', 'Accept-Language': 'pt-BR' } }
          )
          const data = await res.json()
          if (Array.isArray(data) && data.length > 0) {
            const coords: [number, number] = [parseFloat(data[0].lon), parseFloat(data[0].lat)]
            coordsCache[cacheKey] = coords
            return coords
          }
        } catch (e) {}
      }

      // 4. Fallback: Bairro explícito + Cidade no Nominatim
      const bairroToUse = neighborhoodFallback || cleanAddr.split('-')[1]?.split(',')[0]?.trim()
      if (bairroToUse) {
        const qBairro = `${bairroToUse}, ${cleanCity}, Brasil`
        const resB = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(qBairro)}`,
          { headers: { 'User-Agent': 'MetricsPDV/1.0', 'Accept-Language': 'pt-BR' } }
        )
        const dataB = await resB.json()
        if (Array.isArray(dataB) && dataB.length > 0) {
          const coords: [number, number] = [parseFloat(dataB[0].lon), parseFloat(dataB[0].lat)]
          coordsCache[cacheKey] = coords
          return coords
        }
      }
    } catch (e) {
      console.warn('Geocoding fail for:', cleanAddr, e)
    }

    coordsCache[cacheKey] = null
    return null
  }

  // Calcula Rota Completa com OSRM Real
  const calculateRouteDistanceAndTime = async (orderedList: any[]) => {
    setIsCalculatingRoute(true)

    try {
      const cityFallback = profile?.city || 'Caraguatatuba'
      const restCoords = await geocodeAddressSmart(
        restaurantFullAddress,
        profile?.zipcode,
        profile?.neighborhood,
        cityFallback
      )

      const stopsCoords = await Promise.all(
        orderedList.map((o) =>
          geocodeAddressSmart(o.address, o.zipcode, o.neighborhood, o.city || cityFallback)
        )
      )

      // Constrói a sequência completa de waypoints
      const allWaypoints: [number, number][] = []
      if (restCoords) allWaypoints.push(restCoords)

      stopsCoords.forEach((c) => {
        if (c) allWaypoints.push(c)
      })

      if (restCoords && allWaypoints.length > 1) {
        allWaypoints.push(restCoords)
      }

      // Se temos os waypoints completos para chamada da API OSRM:
      if (allWaypoints.length >= orderedList.length + 1) {
        const coordsParam = allWaypoints.map(([lon, lat]) => `${lon},${lat}`).join(';')
        const osrmRes = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${coordsParam}?overview=false&steps=false`
        )
        const osrmData = await osrmRes.json()

        if (osrmData.code === 'Ok' && osrmData.routes && osrmData.routes.length > 0) {
          const r = osrmData.routes[0]
          const totalDistanceKm = Number((r.distance / 1000).toFixed(1))
          const totalDurationMin = Math.ceil(r.duration / 60)

          const legs = (r.legs || []).map((leg: any, idx: number) => {
            const isFirst = idx === 0
            const isLast = idx === orderedList.length

            const fromLabel = isFirst ? 'Restaurante' : `Parada ${idx} (#${orderedList[idx - 1]?.display_id})`
            const toLabel = isLast ? 'Retorno Restaurante' : `Parada ${idx + 1} (#${orderedList[idx]?.display_id})`

            const isSameAddress =
              !isFirst &&
              !isLast &&
              orderedList[idx - 1]?.address?.trim().toLowerCase() ===
                orderedList[idx]?.address?.trim().toLowerCase()

            const distKm = isSameAddress ? 0.0 : Number((leg.distance / 1000).toFixed(1))
            const durMin = isSameAddress ? 0 : Math.ceil(leg.duration / 60)

            return {
              from: fromLabel,
              to: toLabel,
              distanceKm: distKm,
              durationMin: durMin,
              sameAddress: isSameAddress
            }
          })

          setRouteStats({
            totalDistanceKm,
            totalDurationMin,
            legs
          })
          setIsCalculatingRoute(false)
          return
        }
      }

      // Fallback limpo se o OSRM falhar
      const fallbackLegs = orderedList.map((order, idx) => ({
        from: idx === 0 ? 'Restaurante' : `Parada ${idx}`,
        to: `Parada ${idx + 1} (#${order.display_id})`,
        distanceKm: 0,
        durationMin: 0
      }))

      setRouteStats({
        totalDistanceKm: 0,
        totalDurationMin: 0,
        legs: fallbackLegs
      })
    } catch (e) {
      console.warn('Erro no cálculo de rota OSRM:', e)
      setRouteStats(null)
    } finally {
      setIsCalculatingRoute(false)
    }
  }

  // Reordena Parada para Cima na Rota
  const moveRouteOrderUp = (index: number) => {
    if (index <= 0) return
    const updated = [...routeOrders]
    const temp = updated[index]
    updated[index] = updated[index - 1]
    updated[index - 1] = temp
    setRouteOrders(updated)
    calculateRouteDistanceAndTime(updated)
  }

  // Reordena Parada para Baixo na Rota
  const moveRouteOrderDown = (index: number) => {
    if (index >= routeOrders.length - 1) return
    const updated = [...routeOrders]
    const temp = updated[index]
    updated[index] = updated[index + 1]
    updated[index + 1] = temp
    setRouteOrders(updated)
    calculateRouteDistanceAndTime(updated)
  }

  // Despacha todos os pedidos da rota de uma vez
  const handleDispatchRouteBatch = async () => {
    const finalDriver = customRouteDriver.trim() || routeDriver || 'Motoboy em Rota'
    if (routeOrders.length === 0) return

    if (customRouteDriver.trim() && !shiftMotoboys.includes(customRouteDriver.trim())) {
      handleAddShiftMotoboy(customRouteDriver.trim())
    }

    setIsDispatchingBatch(true)
    try {
      await Promise.all(
        routeOrders.map((order) =>
          api.patch(`/public/orders/${order.id}/status`, {
            status: 'dispatched',
            delivery_man: finalDriver
          })
        )
      )

      toast.success(`🛵 Rota com ${routeOrders.length} pedidos despachada para ${finalDriver}!`)
      setRouteModalOpen(false)
      setSelectedOrderIdsForRoute([])
      setRouteOrders([])
      if (onOrderCompleted) onOrderCompleted()
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao despachar rota de pedidos.')
    } finally {
      setIsDispatchingBatch(false)
    }
  }

  const formatBRL = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

  // Métricas do Fechamento do Delivery (Aba Baixados)
  const deliveredStats = useMemo(() => {
    const total = deliveredOrders.reduce((acc, o) => acc + (o.total_amount || 0), 0)
    const count = deliveredOrders.length
    const avg = count > 0 ? total / count : 0

    let pixTotal = 0
    let cardTotal = 0
    let cashTotal = 0

    const driverStats: Record<string, { count: number; fee: number }> = {}

    deliveredOrders.forEach((o) => {
      const obs = (o.observations || '').toLowerCase()
      if (obs.includes('pix')) pixTotal += o.total_amount || 0
      else if (obs.includes('cartão') || obs.includes('débito') || obs.includes('crédito')) cardTotal += o.total_amount || 0
      else if (obs.includes('dinheiro')) cashTotal += o.total_amount || 0

      const dName = o.delivery_man || 'Motoboy Padrão'
      if (!driverStats[dName]) {
        driverStats[dName] = { count: 0, fee: 0 }
      }
      driverStats[dName].count += 1
      driverStats[dName].fee += o.delivery_fee || 5.0
    })

    return { total, count, avg, pixTotal, cardTotal, cashTotal, driverStats }
  }, [deliveredOrders])

  if (!open) return null

  return (
    <>
      {/* ========================================================================= */}
      {/* GAVETA / DRAWER LATERAL (Z-INDEX 50)                                      */}
      {/* ========================================================================= */}
      <div className="fixed inset-0 z-50 flex justify-end pointer-events-none">
        {/* Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto"
        />

        {/* Container da Gaveta */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative z-10 flex h-full w-full max-w-2xl flex-col bg-slate-50 shadow-2xl dark:bg-slate-900 pointer-events-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
                <Bike className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  Gestão de Entregas & Pedidos Online
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Fluxo integrado: Triagem ➡️ Produção ➡️ Rota ➡️ Fechamento
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Abas */}
          <div className="flex border-b border-slate-200 bg-white px-2 dark:border-slate-800 dark:bg-slate-950">
            <button
              onClick={() => setActiveTab('pending')}
              className={`relative flex-1 py-3 text-xs font-bold transition-colors ${
                activeTab === 'pending'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <span>Novos</span>
                <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                  pendingOrders.length > 0
                    ? 'bg-amber-500 text-slate-950 animate-pulse'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  {pendingOrders.length}
                </span>
              </div>
              {activeTab === 'pending' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />}
            </button>

            <button
              onClick={() => setActiveTab('in_preparation')}
              className={`relative flex-1 py-3 text-xs font-bold transition-colors ${
                activeTab === 'in_preparation'
                  ? 'text-orange-600 dark:text-orange-400'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <span>Produção</span>
                <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                  inPrepOrders.length > 0
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  {inPrepOrders.length}
                </span>
              </div>
              {activeTab === 'in_preparation' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />}
            </button>

            <button
              onClick={() => setActiveTab('dispatched')}
              className={`relative flex-1 py-3 text-xs font-bold transition-colors ${
                activeTab === 'dispatched'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <span>Na Rua</span>
                <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                  dispatchedOrders.length > 0
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  {dispatchedOrders.length}
                </span>
              </div>
              {activeTab === 'dispatched' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />}
            </button>

            <button
              onClick={() => setActiveTab('delivered')}
              className={`relative flex-1 py-3 text-xs font-bold transition-colors ${
                activeTab === 'delivered'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <span>Baixados</span>
                <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {deliveredOrders.length}
                </span>
              </div>
              {activeTab === 'delivered' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />}
            </button>
          </div>

          {/* BARRA SUPERIOR DA PRODUÇÃO */}
          {activeTab === 'in_preparation' && inPrepOrders.length > 0 && (
            <div className="sticky top-0 z-20 border-b border-slate-200 bg-orange-50/95 p-2.5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedOrderIdsForRoute.length === inPrepOrders.length) {
                        setSelectedOrderIdsForRoute([])
                      } else {
                        setSelectedOrderIdsForRoute(inPrepOrders.map((o) => o.id))
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    {selectedOrderIdsForRoute.length === inPrepOrders.length ? (
                      <CheckSquare className="h-3.5 w-3.5 text-orange-600" />
                    ) : (
                      <Square className="h-3.5 w-3.5 text-slate-400" />
                    )}
                    <span>
                      {selectedOrderIdsForRoute.length === inPrepOrders.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const allExpanded = inPrepOrders.every((o) => !!expandedOrderIds[o.id])
                      const nextState: Record<string, boolean> = {}
                      inPrepOrders.forEach((o) => {
                        nextState[o.id] = !allExpanded
                      })
                      setExpandedOrderIds(nextState)
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  >
                    {inPrepOrders.every((o) => !!expandedOrderIds[o.id]) ? (
                      <>
                        <ChevronUp className="h-3.5 w-3.5" />
                        <span>Recolher Tudo</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3.5 w-3.5" />
                        <span>Expandir Tudo</span>
                      </>
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={openRouteBuilder}
                  disabled={selectedOrderIdsForRoute.length === 0}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-black shadow-md transition-all ${
                    selectedOrderIdsForRoute.length > 0
                      ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:from-orange-500 hover:to-amber-500 active:scale-98 animate-pulse'
                      : 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'
                  }`}
                >
                  <Route className="h-4 w-4" />
                  <span>
                    Construir Rota {selectedOrderIdsForRoute.length > 0 ? `(${selectedOrderIdsForRoute.length})` : ''} 🛵
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Conteúdo Principal */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {/* ABA BAIXADOS: RESUMO FINANCEIRO */}
            {activeTab === 'delivered' && deliveredOrders.length > 0 && (
              <div className="space-y-3 mb-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5 text-center dark:border-emerald-900/40 dark:bg-emerald-950/20">
                    <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">Faturamento</p>
                    <p className="text-sm font-black text-emerald-700 dark:text-emerald-400">{formatBRL(deliveredStats.total)}</p>
                  </div>
                  <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-2.5 text-center dark:border-blue-900/40 dark:bg-blue-950/20">
                    <p className="text-[10px] font-bold text-blue-800 dark:text-blue-300 uppercase">Entregas</p>
                    <p className="text-sm font-black text-blue-700 dark:text-blue-400">{deliveredStats.count} pedidos</p>
                  </div>
                  <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-2.5 text-center dark:border-purple-900/40 dark:bg-purple-950/20">
                    <p className="text-[10px] font-bold text-purple-800 dark:text-purple-300 uppercase">Ticket Médio</p>
                    <p className="text-sm font-black text-purple-700 dark:text-purple-400">{formatBRL(deliveredStats.avg)}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-center gap-2 mb-2">
                    <Bike className="h-4 w-4 text-orange-500" />
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      Acerto de Taxas dos Motoboys
                    </h4>
                  </div>
                  <div className="divide-y divide-slate-100 text-xs dark:divide-slate-800">
                    {Object.entries(deliveredStats.driverStats).map(([driver, stats]) => (
                      <div key={driver} className="flex items-center justify-between py-1">
                        <span className="font-bold text-slate-700 dark:text-slate-300">{driver}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-500">{stats.count} viagens</span>
                          <span className="font-black text-emerald-600 dark:text-emerald-400">{formatBRL(stats.fee)} a pagar</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* LISTAGEM DE PEDIDOS */}
            {currentList.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-center text-slate-400">
                <PackageCheck className="mb-2 h-12 w-12 opacity-30" />
                <p className="text-sm font-bold">Nenhum pedido nesta etapa</p>
                <p className="text-xs">Os novos pedidos aparecerão aqui automaticamente.</p>
              </div>
            ) : (
              currentList.map((order) => {
                const sla = getSlaInfo(order)
                const paymentBanner = getUnifiedPaymentBanner(order)
                const bairro = (order.neighborhood || '').trim()
                const hasSharedRegion = activeTab === 'in_preparation' && bairro && neighborhoodCountInPrep[bairro.toLowerCase()] > 1

                const drinkItems = (order.items || []).filter((i: any) => isDrinkItem(i.name || ''))
                const foodItems = (order.items || []).filter((i: any) => !isDrinkItem(i.name || ''))
                const totalItemCount = (order.items || []).reduce((acc: number, item: any) => acc + (item.quantity || 1), 0)

                const isProducaoTab = activeTab === 'in_preparation'
                const isNovosTab = activeTab === 'pending'
                const isExpanded = isProducaoTab ? !!expandedOrderIds[order.id] : true
                const isSelectedForRoute = selectedOrderIdsForRoute.includes(order.id)

                // VISUALIZAÇÃO COLAPSADA NA PRODUÇÃO (2 LINHAS)
                if (isProducaoTab && !isExpanded) {
                  return (
                    <div
                      key={order.id}
                      className={`select-text rounded-xl border bg-white px-3 py-2.5 shadow-sm transition-all dark:bg-slate-950 ${
                        isSelectedForRoute
                          ? 'border-orange-500 ring-2 ring-orange-500/20 bg-orange-50/20'
                          : 'border-slate-200 hover:border-slate-300 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedOrderIdsForRoute((prev) =>
                              prev.includes(order.id) ? prev.filter((id) => id !== order.id) : [...prev, order.id]
                            )
                          }}
                          className="text-slate-400 hover:text-orange-600 transition-colors shrink-0"
                          title="Selecionar pedido para montar rota"
                        >
                          {isSelectedForRoute ? (
                            <CheckSquare className="h-5 w-5 text-orange-600" />
                          ) : (
                            <Square className="h-5 w-5" />
                          )}
                        </button>

                        <div
                          onClick={() => setExpandedOrderIds((prev) => ({ ...prev, [order.id]: true }))}
                          className="flex-1 min-w-0 cursor-pointer space-y-0.5"
                          title="Clique para ver pratos e detalhes"
                        >
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="rounded bg-slate-900 px-1.5 py-0.2 text-[11px] font-black text-white dark:bg-slate-100 dark:text-slate-900 shrink-0">
                              #{order.display_id || '0'}
                            </span>
                            <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                              {order.client_name}
                            </span>
                            {bairro && (
                              <span className="rounded bg-blue-100 px-1.5 py-0.2 text-[10px] font-black text-blue-800 dark:bg-blue-950 dark:text-blue-300 shrink-0">
                                📍 {bairro}
                              </span>
                            )}
                            <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-800 dark:bg-orange-950 dark:text-orange-300 shrink-0">
                              📦 {totalItemCount} {totalItemCount === 1 ? 'item' : 'itens'}
                            </span>
                            {renderQuickProductionBadges(order)}
                          </div>

                          <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            <MapPin className="h-3 w-3 text-orange-500 shrink-0" />
                            <span className="truncate">
                              {order.address}{order.city && !order.address.includes(order.city) ? `, ${order.city}` : ''}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-black ${sla.badgeBg}`}>
                            <Clock className="h-2.5 w-2.5" />
                            <span>{sla.minutes}m</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setExpandedOrderIds((prev) => ({ ...prev, [order.id]: true }))}
                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 transition-colors"
                            title="Ver pratos e detalhes"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                }

                // VISUALIZAÇÃO PADRÃO
                return (
                  <div
                    key={order.id}
                    className={`select-text overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition-all dark:bg-slate-950 ${
                      isSelectedForRoute
                        ? 'border-orange-500 ring-2 ring-orange-500/20 bg-orange-50/20'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {/* CABEÇALHO DO CARD */}
                    <div className="flex items-start justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                      <div className="flex items-start gap-2.5">
                        {isProducaoTab && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrderIdsForRoute((prev) =>
                                prev.includes(order.id) ? prev.filter((id) => id !== order.id) : [...prev, order.id]
                              )
                            }}
                            className="mt-0.5 text-slate-400 hover:text-orange-600 transition-colors"
                            title="Selecionar pedido para montar rota"
                          >
                            {isSelectedForRoute ? (
                              <CheckSquare className="h-5 w-5 text-orange-600" />
                            ) : (
                              <Square className="h-5 w-5" />
                            )}
                          </button>
                        )}

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="select-text rounded-md bg-slate-900 px-2 py-0.5 text-xs font-black text-white dark:bg-slate-100 dark:text-slate-900">
                              #{order.display_id || '0'}
                            </span>
                            <h3 className="select-text text-sm font-bold text-slate-900 dark:text-white">
                              {order.client_name}
                            </h3>

                            {isNovosTab && (
                              <button
                                type="button"
                                onClick={(e) => copyFullOrderSummary(order, e)}
                                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                                title="Copiar todos os dados para o PDV"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>

                          {order.client_phone && (
                            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                              <a
                                href={`https://wa.me/55${order.client_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${order.client_name}, sobre o seu pedido #${order.display_id} no delivery:`)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-500/20 dark:bg-emerald-950/50 dark:text-emerald-300 transition-colors"
                              >
                                <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                                <span className="select-text">WhatsApp: {order.client_phone}</span>
                              </a>
                              {isNovosTab && (
                                <button
                                  type="button"
                                  onClick={(e) => copyToClipboard(order.client_phone, 'Telefone', e)}
                                  title="Copiar WhatsApp"
                                  className="rounded-lg border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-right">
                        {activeTab !== 'delivered' && (
                          <div className={`select-text inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-black ${sla.badgeBg}`}>
                            <Clock className="h-3 w-3" />
                            <span className="select-text">{sla.text}</span>
                          </div>
                        )}

                        {isProducaoTab && (
                          <button
                            type="button"
                            onClick={() => setExpandedOrderIds((prev) => ({ ...prev, [order.id]: false }))}
                            className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-500 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                            title="Recolher card"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* ENDEREÇO */}
                    {order.address && (
                      <div className="mt-2.5 flex items-start justify-between gap-2 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                        <div className="flex items-start gap-2 select-text cursor-text">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-500" />
                          <span className="font-medium select-text">
                            {order.address}
                            {order.city && !order.address.includes(order.city) ? `, ${order.city}` : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {isNovosTab && (
                            <button
                              type="button"
                              onClick={(e) => copyToClipboard(order.address, 'Endereço', e)}
                              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                              title="Copiar Endereço"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address + (order.city ? `, ${order.city}` : ''))}`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-200 hover:text-orange-500 dark:hover:bg-slate-800 transition-colors"
                            title="Abrir no Google Maps"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>
                    )}

                    {/* BANNER DE PAGAMENTO */}
                    {!isProducaoTab && (
                      <div className={`mt-2.5 flex items-center gap-2.5 rounded-xl border p-2.5 text-xs ${paymentBanner.style}`}>
                        {paymentBanner.icon}
                        <div className="select-text">
                          <p className="font-black select-text">{paymentBanner.mainText}</p>
                          <p className="text-[11px] opacity-90 select-text">{paymentBanner.subText}</p>
                        </div>
                      </div>
                    )}

                    {/* ALERTA DE REGIÃO */}
                    {hasSharedRegion && (
                      <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/90 p-2.5 text-xs font-bold text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300">
                        <MapPinned className="h-4 w-4 shrink-0 text-blue-600" />
                        <span className="select-text">📍 Região {order.neighborhood}: Há outros pedidos em produção para este mesmo bairro (Aproveite para juntar na mesma rota!).</span>
                      </div>
                    )}

                    {/* BEBIDAS */}
                    {isProducaoTab && drinkItems.length > 0 && (
                      <div className="mt-3 rounded-xl border border-cyan-200 bg-cyan-50/60 p-2.5 dark:border-cyan-900/40 dark:bg-cyan-950/20">
                        <div className="flex items-center gap-1.5 text-[11px] font-black text-cyan-900 dark:text-cyan-300 mb-1.5 uppercase tracking-wider">
                          <CupSoda className="h-3.5 w-3.5 text-cyan-600" />
                          <span>Itens de Geladeira / Bebidas (Conferir):</span>
                        </div>
                        <div className="space-y-1">
                          {drinkItems.map((item: any) => {
                            const key = `${order.id}-${item.id}`
                            const isChecked = !!checkedDrinks[key]

                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => setCheckedDrinks((prev) => ({ ...prev, [key]: !prev[key] }))}
                                className="flex w-full items-center gap-2 text-left text-xs font-bold text-slate-800 dark:text-slate-200 select-text cursor-pointer"
                              >
                                {isChecked ? (
                                  <CheckSquare className="h-4 w-4 text-emerald-600 shrink-0" />
                                ) : (
                                  <Square className="h-4 w-4 text-slate-400 shrink-0" />
                                )}
                                <span className={`select-text ${isChecked ? 'line-through opacity-50' : ''}`}>
                                  {item.quantity}x {item.name}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* ITENS */}
                    <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 select-text">
                        {isProducaoTab ? 'Pratos & Produção:' : 'Itens do Pedido:'}
                      </p>

                      {(isProducaoTab ? foodItems : order.items)?.map((item: any) => {
                        const itemName = item.name || 'Item'
                        const obsItem = (item.observation || '').trim()
                        const showObs = obsItem && obsItem.toLowerCase() !== itemName.toLowerCase()

                        return (
                          <div key={item.id} className="space-y-0.5 text-xs select-text cursor-text">
                            <div className="flex items-start justify-between font-bold text-slate-800 dark:text-slate-200">
                              <div className="flex items-center gap-1.5">
                                {isNovosTab && (
                                  <button
                                    type="button"
                                    onClick={(e) => copyToClipboard(itemName, 'Nome do item', e)}
                                    className="rounded p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                                    title="Copiar nome do item"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </button>
                                )}
                                <span className="select-text">{item.quantity}x {itemName}</span>
                              </div>
                              {!isProducaoTab && (
                                <span className="select-text">{formatBRL(item.price * item.quantity)}</span>
                              )}
                            </div>

                            {Array.isArray(item.complements) && item.complements.length > 0 && (
                              <div className="pl-5 space-y-0.5 text-[11px] text-emerald-700 dark:text-emerald-400 select-text">
                                {item.complements.map((c: any, idx: number) => (
                                  <div key={idx} className="flex items-center gap-1.5 font-medium select-text">
                                    {isNovosTab && (
                                      <button
                                        type="button"
                                        onClick={(e) => copyToClipboard(c.name, 'Adicional', e)}
                                        className="rounded p-0.5 text-emerald-500/70 hover:text-emerald-800 transition-colors"
                                        title="Copiar adicional"
                                      >
                                        <Copy className="h-2.5 w-2.5" />
                                      </button>
                                    )}
                                    <span className="select-text">
                                      + {c.quantity && c.quantity > 1 ? `${c.quantity}x ` : ''}{c.name}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {showObs && (
                              <div className="pl-5 flex items-center gap-1.5 text-[11px] italic font-semibold text-amber-700 dark:text-amber-400 select-text">
                                {isNovosTab && (
                                  <button
                                    type="button"
                                    onClick={(e) => copyToClipboard(obsItem, 'Observação', e)}
                                    className="rounded p-0.5 text-amber-500/70 hover:text-amber-800 transition-colors"
                                    title="Copiar observação"
                                  >
                                    <Copy className="h-2.5 w-2.5" />
                                  </button>
                                )}
                                <span className="select-text">Obs: {obsItem}</span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Na Rua */}
                    {activeTab === 'dispatched' && (
                      <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50/60 p-2.5 text-xs dark:border-blue-900/40 dark:bg-blue-950/20">
                        <div className="flex items-center justify-between font-bold text-blue-950 dark:text-blue-200">
                          <span className="flex items-center gap-1.5 select-text">
                            <Bike className="h-4 w-4 text-blue-600" />
                            <span className="select-text">Entregador: {order.delivery_man || 'Motoboy em Rota'}</span>
                          </span>
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 select-text">
                            {order.departed_at ? `Saída às ${new Date(order.departed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Em trânsito'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Ações */}
                    <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                      {order.status === 'pending' && (
                        <button
                          disabled={loadingOrderId === order.id}
                          onClick={() => handleUpdateStatus(order.id, 'in_preparation')}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-xs font-black text-slate-950 shadow-md transition-transform hover:bg-amber-400 active:scale-98"
                        >
                          <ChefHat className="h-4 w-4" />
                          <span>Aceitar e Enviar para Produção</span>
                        </button>
                      )}

                      {order.status === 'in_preparation' && (
                        <button
                          disabled={loadingOrderId === order.id}
                          onClick={() => openDispatch(order)}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 py-2.5 text-xs font-black text-white shadow-md transition-transform hover:bg-orange-500 active:scale-98"
                        >
                          <Bike className="h-4 w-4" />
                          <span>Despachar Individual / Saiu com Motoboy</span>
                        </button>
                      )}

                      {order.status === 'dispatched' && (
                        <button
                          disabled={loadingOrderId === order.id}
                          onClick={() => handleUpdateStatus(order.id, 'delivered')}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-black text-white shadow-md transition-transform hover:bg-emerald-500 active:scale-98"
                        >
                          <DollarSign className="h-4 w-4" />
                          <span>Confirmar Retorno & Dar Baixa no Caixa</span>
                        </button>
                      )}

                      {order.status === 'delivered' && (
                        <div className="flex items-center justify-center gap-1.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Venda Lançada no Caixa com Sucesso</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </motion.div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL DE CONSTRUÇÃO DE ROTA & DESPACHO EM LOTE (Z-INDEX 100 - NA FRENTE)  */}
      {/* ========================================================================= */}
      {routeModalOpen && routeOrders.length > 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative z-10 w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col">
            {/* Header do Modal de Rota */}
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600">
                  <Route className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Montagem de Rota & Despacho ({routeOrders.length} Pedidos)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Defina a ordem das paradas e confira o trajeto com retorno.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRouteModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {/* SELEÇÃO DO MOTOBOY DO TURNO */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  🛵 Qual motoboy levará esta bag/rota?
                </label>

                {shiftMotoboys.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {shiftMotoboys.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          setRouteDriver(name)
                          setCustomRouteDriver('')
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
                          routeDriver === name && !customRouteDriver
                            ? 'border-orange-500 bg-orange-50 text-orange-950 ring-2 ring-orange-500/20 dark:bg-orange-950/40 dark:text-orange-200'
                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        <span>🛵 {name}</span>
                        <span
                          onClick={(e) => handleRemoveShiftMotoboy(name, e)}
                          className="text-slate-400 hover:text-rose-500 p-0.5 rounded"
                          title="Remover do turno"
                        >
                          ✕
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Digite o nome do motoboy para esta rota..."
                    value={customRouteDriver}
                    onChange={(e) => {
                      setCustomRouteDriver(e.target.value)
                      setRouteDriver(e.target.value)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customRouteDriver.trim()) {
                        handleAddShiftMotoboy(customRouteDriver.trim())
                      }
                    }}
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                  {customRouteDriver.trim() && (
                    <button
                      type="button"
                      onClick={() => handleAddShiftMotoboy(customRouteDriver.trim())}
                      className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
                      title="Salvar motoboy no turno"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Salvar no turno</span>
                    </button>
                  )}
                </div>
              </div>

              {/* CARD DE RESUMO DA DISTÂNCIA & TEMPO TOTAL */}
              <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 p-3.5 dark:border-blue-900/40 dark:bg-blue-950/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-black text-blue-950 dark:text-blue-200">
                    <Compass
                      className="h-4 w-4 text-blue-600 animate-spin"
                      style={{ animationDuration: isCalculatingRoute ? '1.5s' : '0s' }}
                    />
                    <span>Cálculo de Trajeto & Distância:</span>
                  </div>
                  {isCalculatingRoute ? (
                    <span className="text-[10px] text-blue-600 animate-pulse font-bold">
                      Calculando via satélite OSRM...
                    </span>
                  ) : (
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      ✓ Rota Traçada (GPS / OSRM)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-xl bg-white/80 p-2 dark:bg-slate-900/60">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Distância Total (Ida + Volta)</p>
                    <p className="text-base font-black text-blue-600 dark:text-blue-400">
                      {isCalculatingRoute
                        ? 'Calculando...'
                        : routeStats?.totalDistanceKm !== undefined
                        ? `${routeStats.totalDistanceKm} km`
                        : '0 km'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/80 p-2 dark:bg-slate-900/60">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Tempo Estimado de Percurso</p>
                    <p className="text-base font-black text-indigo-600 dark:text-indigo-400">
                      {isCalculatingRoute
                        ? 'Calculando...'
                        : routeStats?.totalDurationMin !== undefined
                        ? `~${routeStats.totalDurationMin} min`
                        : '0 min'}
                    </p>
                  </div>
                </div>
              </div>

              {/* SEQUÊNCIA E ORDENAÇÃO DAS PARADAS */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    📍 Sequência das Paradas & Distância Entre Elas:
                  </label>
                  <span className="text-[10px] text-slate-400">Clique nas setas para reordenar</span>
                </div>

                <div className="space-y-1.5">
                  {/* Ponto de Partida: Restaurante */}
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5 text-xs dark:border-emerald-900/40 dark:bg-emerald-950/20">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-black text-white shrink-0">
                      🏁
                    </div>
                    <div className="flex-1 truncate">
                      <p className="font-bold text-emerald-950 dark:text-emerald-200">Partida: Restaurante</p>
                      <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 truncate">
                        {restaurantFullAddress}
                      </p>
                    </div>
                  </div>

                  {/* Paradas dos Pedidos */}
                  {routeOrders.map((order, idx) => {
                    const legInfo = routeStats?.legs?.[idx]
                    return (
                      <React.Fragment key={order.id}>
                        {/* Conector de Distância/Tempo */}
                        {legInfo && (
                          <div className="flex items-center justify-center py-0.5">
                            <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                              <span>⬇️</span>
                              {legInfo.sameAddress ? (
                                <span className="font-black text-emerald-600 dark:text-emerald-400">
                                  0.0 km • Mesmo local
                                </span>
                              ) : (
                                <span>
                                  {legInfo.distanceKm} km • ~{legInfo.durationMin} min
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs dark:border-slate-800 dark:bg-slate-950">
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-[11px] font-black text-white shrink-0">
                              {idx + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-black text-slate-900 dark:text-white">
                                  #{order.display_id}
                                </span>
                                <span className="font-bold text-slate-700 dark:text-slate-300 truncate">
                                  {order.client_name}
                                </span>
                                {order.neighborhood && (
                                  <span className="rounded bg-blue-100 px-1.5 py-0.2 text-[10px] font-black text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                    {order.neighborhood}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-[11px] text-slate-500 truncate flex-1">{order.address}</p>
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address + (order.city ? `, ${order.city}` : ''))}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] text-blue-600 hover:underline inline-flex items-center gap-0.5 shrink-0"
                                >
                                  <span>Maps</span>
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              </div>
                            </div>
                          </div>

                          {/* Botões Subir / Descer */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveRouteOrderUp(idx)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
                              title="Subir parada"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === routeOrders.length - 1}
                              onClick={() => moveRouteOrderDown(idx)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
                              title="Descer parada"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </React.Fragment>
                    )
                  })}

                  {/* Conector para Retorno */}
                  {routeStats?.legs?.[routeOrders.length] && (
                    <div className="flex items-center justify-center py-0.5">
                      <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                        <span>⬇️</span>
                        {routeStats.legs[routeOrders.length].sameAddress ? (
                          <span className="font-black text-emerald-600 dark:text-emerald-400">
                            0.0 km • Mesmo local (volta)
                          </span>
                        ) : (
                          <span>
                            {routeStats.legs[routeOrders.length].distanceKm} km • ~
                            {routeStats.legs[routeOrders.length].durationMin} min (volta)
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Retorno */}
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100/70 p-2.5 text-xs dark:border-slate-800 dark:bg-slate-900/60">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 text-[10px] font-black text-white shrink-0">
                      🔄
                    </div>
                    <div className="flex-1 truncate">
                      <p className="font-bold text-slate-800 dark:text-slate-200">Retorno: Restaurante (Fechamento)</p>
                      <p className="text-[11px] text-slate-500 truncate">{restaurantFullAddress}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Rodapé */}
            <div className="border-t pt-3 flex gap-2 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRouteModalOpen(false)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDispatchingBatch}
                onClick={handleDispatchRouteBatch}
                className="flex-1 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 py-2.5 text-xs font-black text-white shadow-lg hover:from-orange-500 hover:to-amber-500 disabled:opacity-50"
              >
                {isDispatchingBatch ? 'Despachando...' : `Despachar Rota (${routeOrders.length} Pedidos) 🚀`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE DESPACHO INDIVIDUAL (Z-INDEX 100 - NA FRENTE)                    */}
      {/* ========================================================================= */}
      {dispatchModalOpen && orderToDispatch && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Bike className="h-5 w-5 text-orange-500" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Despachar Pedido #{orderToDispatch.display_id}
                </h3>
              </div>
              <button onClick={() => setDispatchModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Qual entregador está levando?
                </label>

                {shiftMotoboys.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {shiftMotoboys.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          setSelectedDriver(name)
                          setCustomDriverName('')
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
                          selectedDriver === name && !customDriverName
                            ? 'border-orange-500 bg-orange-50 text-orange-950 ring-2 ring-orange-500/20 dark:bg-orange-950/40 dark:text-orange-200'
                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        <span>🛵 {name}</span>
                        <span
                          onClick={(e) => handleRemoveShiftMotoboy(name, e)}
                          className="text-slate-400 hover:text-rose-500 p-0.5 rounded"
                          title="Remover do turno"
                        >
                          ✕
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Digite o nome do motoboy..."
                    value={customDriverName}
                    onChange={(e) => {
                      setCustomDriverName(e.target.value)
                      setSelectedDriver(e.target.value)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customDriverName.trim()) {
                        handleAddShiftMotoboy(customDriverName.trim())
                      }
                    }}
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                  {customDriverName.trim() && (
                    <button
                      type="button"
                      onClick={() => handleAddShiftMotoboy(customDriverName.trim())}
                      className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
                      title="Salvar motoboy no turno"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Salvar</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs dark:border-amber-900/40 dark:bg-amber-950/20">
                <p className="font-black text-amber-950 dark:text-amber-200 mb-1">⚠️ Checklist de Saída:</p>
                <ul className="space-y-1 text-amber-900 dark:text-amber-300 text-[11px]">
                  <li>• Bebidas e refrigerantes conferidos?</li>
                  <li>• Maquininha / Troco separado na bag?</li>
                  <li>• Endereço verificado: {orderToDispatch.address}</li>
                </ul>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setDispatchModalOpen(false)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={loadingOrderId === orderToDispatch.id}
                onClick={() => {
                  const finalDriver = customDriverName.trim() || selectedDriver
                  if (customDriverName.trim() && !shiftMotoboys.includes(customDriverName.trim())) {
                    handleAddShiftMotoboy(customDriverName.trim())
                  }
                  handleUpdateStatus(orderToDispatch.id, 'dispatched', finalDriver)
                }}
                className="flex-1 rounded-xl bg-orange-600 py-2.5 text-xs font-black text-white shadow-lg hover:bg-orange-500"
              >
                Confirmar Saída
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
