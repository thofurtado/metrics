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
  MapPinned
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
  
  // Modal de Despacho com Motoboy
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

  if (!open) return null

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

  // Cálculo inteligente de SLA com base nos setores configurados
  const getSlaInfo = (order: any) => {
    const createdMs = order.created_at ? new Date(order.created_at).getTime() : Date.now()
    const diffMin = Math.max(0, Math.floor((currentTime - createdMs) / 60000))

    let slaMin = 30
    let slaMax = 50

    // Busca no setor de entrega correspondente se houver
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

  // Alerta Unificado de Pagamento + Valor
  const getUnifiedPaymentBanner = (order: any) => {
    const obs = (order.observations || '').trim()
    const total = order.total_amount || 0
    const totalFmt = formatBRL(total)

    const isCartao = obs.toLowerCase().includes('cartão') || obs.toLowerCase().includes('débito') || obs.toLowerCase().includes('crédito')
    const isDinheiro = obs.toLowerCase().includes('dinheiro')
    const isPix = obs.toLowerCase().includes('pix')

    if (isPix) {
      return {
        icon: <Sparkles className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400" />,
        mainText: `📱 ${totalFmt} — PIX (Aguardando Comprovante)`,
        subText: 'Solicitar comprovante ao cliente ou verificar crédito no App do Banco.',
        style: 'border-purple-200 bg-purple-50/80 text-purple-950 dark:border-purple-900/50 dark:bg-purple-950/30 dark:text-purple-200'
      }
    }

    if (isCartao) {
      const tipo = obs.toLowerCase().includes('débito') ? 'Débito' : obs.toLowerCase().includes('crédito') ? 'Crédito' : 'Cartão'
      return {
        icon: <CreditCard className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />,
        mainText: `💳 ${totalFmt} — Cartão de ${tipo} (Levar Maquininha)`,
        subText: 'Cobrar na entrega com a maquininha sem fio.',
        style: 'border-blue-200 bg-blue-50/90 text-blue-950 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200'
      }
    }

    if (isDinheiro) {
      const matchTroco = obs.match(/Troco para R$s*([d.,]+)/i)
      if (matchTroco) {
        const valorTrocoPara = parseFloat(matchTroco[1].replace(',', '.'))
        const valorDevolver = Math.max(0, valorTrocoPara - total)
        return {
          icon: <Banknote className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />,
          mainText: `💵 ${totalFmt} — Dinheiro (Troco de ${formatBRL(valorDevolver)})`,
          subText: `Cliente pagará com ${formatBRL(valorTrocoPara)}. Não esqueça de separar o troco!`,
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
    setDispatchModalOpen(true)
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

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
      />

      {/* Container */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative z-10 flex h-full w-full max-w-xl flex-col bg-slate-50 shadow-2xl dark:bg-slate-900"
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

        {/* Abas com Nomenclatura Operacional Correta */}
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

        {/* Guia de Contexto Superior */}
        <div className="border-b border-slate-200 bg-slate-100/80 px-4 py-2 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
          {activeTab === 'pending' && (
            <p>⚡ <strong>Triagem Imediata:</strong> Valide o comprovante/troco e aprove para produção.</p>
          )}
          {activeTab === 'in_preparation' && (
            <p>🍳 <strong>Produção & Expedição:</strong> Acompanhe os pratos, confira bebidas na geladeira e despache.</p>
          )}
          {activeTab === 'dispatched' && (
            <p>🛵 <strong>Entregas em Rota:</strong> Monitore o motoboy e dê baixa no caixa ao retorno.</p>
          )}
          {activeTab === 'delivered' && (
            <p>📊 <strong>Fechamento do Delivery:</strong> Faturamento do turno e acerto de diárias dos motoboys.</p>
          )}
        </div>

        {/* Conteúdo Principal */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {/* ======================================================== */}
          {/* ABA BAIXADOS: PAINEL DE FECHAMENTO COMPLETO             */}
          {/* ======================================================== */}
          {activeTab === 'delivered' && deliveredOrders.length > 0 && (
            <div className="space-y-4 mb-4">
              {/* Cards de Resumo */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-center dark:border-emerald-900/40 dark:bg-emerald-950/20">
                  <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">Faturamento</p>
                  <p className="text-sm font-black text-emerald-700 dark:text-emerald-400">{formatBRL(deliveredStats.total)}</p>
                </div>
                <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-center dark:border-blue-900/40 dark:bg-blue-950/20">
                  <p className="text-[10px] font-bold text-blue-800 dark:text-blue-300 uppercase">Entregas</p>
                  <p className="text-sm font-black text-blue-700 dark:text-blue-400">{deliveredStats.count} pedidos</p>
                </div>
                <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-3 text-center dark:border-purple-900/40 dark:bg-purple-950/20">
                  <p className="text-[10px] font-bold text-purple-800 dark:text-purple-300 uppercase">Ticket Médio</p>
                  <p className="text-sm font-black text-purple-700 dark:text-purple-400">{formatBRL(deliveredStats.avg)}</p>
                </div>
              </div>

              {/* Acerto de Diária dos Motoboys */}
              <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center gap-2 mb-2">
                  <Bike className="h-4 w-4 text-orange-500" />
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Acerto de Taxas dos Motoboys
                  </h4>
                </div>
                <div className="divide-y divide-slate-100 text-xs dark:divide-slate-800">
                  {Object.entries(deliveredStats.driverStats).map(([driver, stats]) => (
                    <div key={driver} className="flex items-center justify-between py-1.5">
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

          {/* ======================================================== */}
          {/* LISTAGEM DE PEDIDOS                                     */}
          {/* ======================================================== */}
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
              const bairro = (order.neighborhood || '').trim().toLowerCase()
              const hasSharedRegion = activeTab === 'in_preparation' && bairro && neighborhoodCountInPrep[bairro] > 1

              // Separa itens normais de bebidas
              const drinkItems = (order.items || []).filter((i: any) => isDrinkItem(i.name || ''))
              const foodItems = (order.items || []).filter((i: any) => !isDrinkItem(i.name || ''))

              return (
                <div
                  key={order.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all dark:border-slate-800 dark:bg-slate-950"
                >
                  {/* Cabeçalho do Card */}
                  <div className="flex items-start justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-slate-900 px-2 py-0.5 text-xs font-black text-white dark:bg-slate-100 dark:text-slate-900">
                          #{order.display_id || '0'}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {order.client_name}
                        </h3>
                      </div>
                      
                      {/* Botão de WhatsApp Claro e Acessível */}
                      {order.client_phone && (
                        <div className="mt-1.5">
                          <a
                            href={`https://wa.me/55${order.client_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${order.client_name}, sobre o seu pedido #${order.display_id} no delivery:`)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-500/20 dark:bg-emerald-950/50 dark:text-emerald-300 transition-colors"
                          >
                            <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                            <span>WhatsApp: {order.client_phone}</span>
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="text-right space-y-1">
                      {/* SLA com Cores Dinâmicas */}
                      {activeTab !== 'delivered' && (
                        <div className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-black ${sla.badgeBg}`}>
                          <Clock className="h-3 w-3" />
                          <span>{sla.text}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Endereço de Entrega */}
                  {order.address && (
                    <div className="mt-2.5 flex items-start justify-between gap-2 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-500" />
                        <span className="font-medium">{order.address}</span>
                      </div>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 text-slate-400 hover:text-orange-500"
                        title="Abrir no Google Maps"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  )}

                  {/* Banner Unificado de Valor + Forma de Pagamento (Oculto em Produção) */}
                  {activeTab !== 'in_preparation' && (
                    <div className={`mt-2.5 flex items-center gap-2.5 rounded-xl border p-2.5 text-xs ${paymentBanner.style}`}>
                      {paymentBanner.icon}
                      <div>
                        <p className="font-black">{paymentBanner.mainText}</p>
                        <p className="text-[11px] opacity-90">{paymentBanner.subText}</p>
                      </div>
                    </div>
                  )}

                  {/* ALERTA DE REGIÃO COMPARTILHADA (Aba Produção) */}
                  {hasSharedRegion && (
                    <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/90 p-2.5 text-xs font-bold text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300">
                      <MapPinned className="h-4 w-4 shrink-0 text-blue-600" />
                      <span>📍 Região {order.neighborhood}: Há outros pedidos em produção para este mesmo bairro (Aproveite para juntar na mesma bag!).</span>
                    </div>
                  )}

                  {/* ======================================================== */}
                  {/* SEÇÃO DE BEBIDAS / GELADEIRA (Aba Produção)             */}
                  {/* ======================================================== */}
                  {drinkItems.length > 0 && (
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
                              className="flex w-full items-center gap-2 text-left text-xs font-bold text-slate-800 dark:text-slate-200"
                            >
                              {isChecked ? (
                                <CheckSquare className="h-4 w-4 text-emerald-600" />
                              ) : (
                                <Square className="h-4 w-4 text-slate-400" />
                              )}
                              <span className={isChecked ? 'line-through opacity-50' : ''}>
                                {item.quantity}x {item.name}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* ITENS DE PRODUÇÃO / PRATOS */}
                  <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      {activeTab === 'in_preparation' ? 'Pratos & Produção:' : 'Itens do Pedido:'}
                    </p>
                    {(activeTab === 'in_preparation' ? foodItems : order.items)?.map((item: any) => {
                      const itemName = item.name || 'Item'
                      const obsItem = (item.observation || '').trim()
                      const showObs = obsItem && obsItem.toLowerCase() !== itemName.toLowerCase()

                      return (
                        <div key={item.id} className="space-y-0.5 text-xs">
                          <div className="flex items-start justify-between font-bold text-slate-800 dark:text-slate-200">
                            <span>{item.quantity}x {itemName}</span>
                            {/* Oculta valores em R$ na Produção */}
                            {activeTab !== 'in_preparation' && (
                              <span>{formatBRL(item.price * item.quantity)}</span>
                            )}
                          </div>
                          {Array.isArray(item.complements) && item.complements.length > 0 && (
                            <div className="pl-3 space-y-0.5 text-[11px] text-emerald-700 dark:text-emerald-400">
                              {item.complements.map((c: any, idx: number) => (
                                <span key={idx} className="block font-medium">
                                  + {c.quantity && c.quantity > 1 ? `${c.quantity}x ` : ''}{c.name}
                                </span>
                              ))}
                            </div>
                          )}
                          {showObs && (
                            <div className="pl-3 text-[11px] italic font-semibold text-amber-700 dark:text-amber-400">
                              Obs: {obsItem}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Informações de Rota do Motoboy (Aba Na Rua) */}
                  {activeTab === 'dispatched' && (
                    <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50/60 p-2.5 text-xs dark:border-blue-900/40 dark:bg-blue-950/20">
                      <div className="flex items-center justify-between font-bold text-blue-950 dark:text-blue-200">
                        <span className="flex items-center gap-1.5">
                          <Bike className="h-4 w-4 text-blue-600" />
                          <span>Entregador: {order.delivery_man || 'Motoboy em Rota'}</span>
                        </span>
                        <span className="text-[10px] text-blue-600 dark:text-blue-400">
                          {order.departed_at ? `Saída às ${new Date(order.departed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Em trânsito'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Botões de Ação */}
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
                        <span>Despachar / Saiu com o Motoboy</span>
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

      {/* ======================================================== */}
      {/* MODAL DE DESPACHO & SELEÇÃO DE MOTOBOY                   */}
      {/* ======================================================== */}
      {dispatchModalOpen && orderToDispatch && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
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
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {['Carlos (Moto 1)', 'João (Moto 2)', 'Lucas (Moto 3)', 'Entregador Próprio'].map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        setSelectedDriver(name)
                        setCustomDriverName('')
                      }}
                      className={`rounded-xl border p-2.5 text-xs font-bold text-left transition-colors ${
                        selectedDriver === name
                          ? 'border-orange-500 bg-orange-50 text-orange-950 dark:bg-orange-950/40 dark:text-orange-200'
                          : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800'
                      }`}
                    >
                      🛵 {name}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Ou digite outro nome..."
                  value={customDriverName}
                  onChange={(e) => {
                    setCustomDriverName(e.target.value)
                    setSelectedDriver(e.target.value)
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              {/* Checklist Rápido de Saída */}
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
                Cancelar
              </button>
              <button
                type="button"
                disabled={loadingOrderId === orderToDispatch.id}
                onClick={() => handleUpdateStatus(orderToDispatch.id, 'dispatched', selectedDriver || 'Motoboy')}
                className="flex-1 rounded-xl bg-orange-600 py-2.5 text-xs font-black text-white hover:bg-orange-500 shadow-md"
              >
                Confirmar Saída
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
