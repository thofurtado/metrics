'use client'
import React, { useEffect, useState } from 'react'
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
  MessageCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/axios'

interface DeliveryOrdersDrawerProps {
  open: boolean
  onClose: () => void
  initialTab?: 'pending' | 'in_preparation' | 'dispatched' | 'delivered'
  orders: any[]
  sessionId?: string
  onOrderCompleted?: () => void
}

export function DeliveryOrdersDrawer({
  open,
  onClose,
  initialTab = 'pending',
  orders,
  sessionId,
  onOrderCompleted
}: DeliveryOrdersDrawerProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'in_preparation' | 'dispatched' | 'delivered'>(initialTab)
  const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState<number>(Date.now())

  // Atualiza o relógio a cada 10 segundos para manter os SLAs sempre precisos em tempo real
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

  const handleUpdateStatus = async (orderId: string, nextStatus: string, paymentMethod?: string) => {
    setLoadingOrderId(orderId)
    try {
      await api.patch(`/public/orders/${orderId}/status`, {
        status: nextStatus,
        cashier_session_id: nextStatus === 'delivered' ? sessionId : undefined,
        payment_method: paymentMethod
      })

      if (nextStatus === 'in_preparation') {
        toast.success('Pedido Aceito! Enviado para a cozinha e cliente notificado.')
      } else if (nextStatus === 'dispatched') {
        toast.success('Pedido Despachado! Notificação enviada para o cliente.')
      } else if (nextStatus === 'delivered') {
        toast.success('Baixa confirmada! Venda lançada com sucesso no caixa.')
      }

      if (onOrderCompleted) onOrderCompleted()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.response?.data?.message || 'Erro ao atualizar status do pedido.')
    } finally {
      setLoadingOrderId(null)
    }
  }

  const formatBRL = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

  // 1. Cálculo inteligente de SLA com Cores Dinâmicas
  const getSlaInfo = (dateString?: string) => {
    if (!dateString) return { minutes: 0, text: '', variant: 'normal', badgeBg: '' }
    const createdMs = new Date(dateString).getTime()
    const diffMin = Math.max(0, Math.floor((currentTime - createdMs) / 60000))

    const SLA_MIN = 35
    const SLA_MAX = 50

    if (diffMin < SLA_MIN) {
      return {
        minutes: diffMin,
        text: `⏱️ ${diffMin} min (No prazo)`,
        variant: 'green',
        badgeBg: 'bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
      }
    } else if (diffMin <= SLA_MAX) {
      return {
        minutes: diffMin,
        text: `⚠️ ${diffMin} min (${SLA_MAX - diffMin}m p/ limite)`,
        variant: 'yellow',
        badgeBg: 'bg-amber-500/10 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
      }
    } else {
      return {
        minutes: diffMin,
        text: `🚨 Atrasado há ${diffMin - SLA_MAX} min (${diffMin}m total)`,
        variant: 'red',
        badgeBg: 'bg-rose-500/10 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 animate-pulse'
      }
    }
  }

  // 2. Alertas Contextuais de Pagamento, Maquininha e Troco
  const getPaymentAlert = (order: any) => {
    const obs = (order.observations || '').trim()
    const total = order.total_amount || 0

    const isCartao = obs.toLowerCase().includes('cartão') || obs.toLowerCase().includes('débito') || obs.toLowerCase().includes('crédito')
    const isDinheiro = obs.toLowerCase().includes('dinheiro')
    const isPix = obs.toLowerCase().includes('pix')

    if (isCartao) {
      const tipoCartao = obs.toLowerCase().includes('débito') ? 'Débito' : obs.toLowerCase().includes('crédito') ? 'Crédito' : 'Cartão'
      return {
        type: 'card',
        icon: <CreditCard className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />,
        title: `LEVAR MAQUININHA (${tipoCartao.toUpperCase()})`,
        subtitle: `Cobrar ${formatBRL(total)} na entrega`,
        style: 'border-blue-200 bg-blue-50/90 text-blue-950 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200'
      }
    }

    if (isDinheiro) {
      const matchTroco = obs.match(/Troco para R$s*([d.,]+)/i)
      if (matchTroco) {
        const valorTrocoPara = parseFloat(matchTroco[1].replace(',', '.'))
        const valorDevolver = Math.max(0, valorTrocoPara - total)
        return {
          type: 'change',
          icon: <Banknote className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />,
          title: `SEPARAR R$ ${valorDevolver.toFixed(2)} EM TROCO`,
          subtitle: `Cliente pagará com R$ ${valorTrocoPara.toFixed(2)} (Total do pedido: ${formatBRL(total)})`,
          style: 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200'
        }
      }
      return {
        type: 'cash',
        icon: <Banknote className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />,
        title: `RECEBER EM DINHEIRO: ${formatBRL(total)}`,
        subtitle: 'Cliente informou que não precisa de troco',
        style: 'border-amber-200 bg-amber-50/70 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200'
      }
    }

    if (isPix) {
      return {
        type: 'pix',
        icon: <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />,
        title: 'PAGAMENTO PIX (JÁ PAGO ONLINE)',
        subtitle: 'Não cobrar valor na entrega / Apenas entregar o pedido',
        style: 'border-emerald-200 bg-emerald-50/90 text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200'
      }
    }

    // Fallback padrão se não categorizou
    return {
      type: 'default',
      icon: <AlertTriangle className="h-4 w-4 shrink-0 text-slate-500" />,
      title: 'INFORMAÇÕES DE PAGAMENTO',
      subtitle: obs || 'Conferir cobrança na entrega',
      style: 'border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
      />

      {/* Drawer Container */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative z-10 flex h-full w-full max-w-xl flex-col bg-slate-50 shadow-2xl dark:bg-slate-900"
      >
        {/* Header do Drawer */}
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
                Acompanhe o fluxo operacional com alertas de despacho e SLAs
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

        {/* Abas Operacionais com Badges de Contagem */}
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
            {activeTab === 'pending' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />
            )}
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
              <span>Cozinha</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                inPrepOrders.length > 0
                  ? 'bg-orange-500 text-white'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {inPrepOrders.length}
              </span>
            </div>
            {activeTab === 'in_preparation' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
            )}
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
            {activeTab === 'dispatched' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
            )}
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
            {activeTab === 'delivered' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
            )}
          </button>
        </div>

        {/* Guia de Contexto Superior */}
        <div className="border-b border-slate-200 bg-slate-100/80 px-4 py-2 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
          {activeTab === 'pending' && (
            <p>⚡ <strong>Triagem Imediata:</strong> Revise pagamento, troco e aprove o pedido com 1 clique.</p>
          )}
          {activeTab === 'in_preparation' && (
            <p>🍳 <strong>Cozinha em Ação:</strong> Acompanhe o SLA de preparo. Ao embalar, despache para o motoboy.</p>
          )}
          {activeTab === 'dispatched' && (
            <p>🛵 <strong>Em Rota de Entrega:</strong> Monitore endereço e WhatsApp. Ao retornar, dê baixa no caixa.</p>
          )}
          {activeTab === 'delivered' && (
            <p>✅ <strong>Histórico de Baixas:</strong> Pedidos entregues e valores lançados no saldo do caixa.</p>
          )}
        </div>

        {/* Lista de Pedidos com Cards Especializados */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {currentList.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center text-slate-400">
              <PackageCheck className="mb-2 h-12 w-12 opacity-30" />
              <p className="text-sm font-bold">Nenhum pedido nesta etapa</p>
              <p className="text-xs">Os novos pedidos aparecerão aqui automaticamente.</p>
            </div>
          ) : (
            currentList.map((order) => {
              const sla = getSlaInfo(order.created_at)
              const paymentAlert = getPaymentAlert(order)

              return (
                <div
                  key={order.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all dark:border-slate-800 dark:bg-slate-950"
                >
                  {/* Cabeçalho do Card com SLA */}
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
                      {order.client_phone && (
                        <div className="mt-1 flex items-center gap-2">
                          <p className="flex items-center gap-1 text-xs text-slate-500">
                            <Phone className="h-3 w-3" /> {order.client_phone}
                          </p>
                          {/* Botão de WhatsApp Rápido na Rua */}
                          {activeTab === 'dispatched' && (
                            <a
                              href={`https://wa.me/55${order.client_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${order.client_name}, seu pedido #${order.display_id} está a caminho!`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                            >
                              <MessageCircle className="h-3 w-3" /> WhatsApp
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="text-right space-y-1">
                      <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                        {formatBRL(order.total_amount)}
                      </span>
                      {/* Badge de SLA com Cores Dinâmicas */}
                      {activeTab !== 'delivered' && (
                        <div className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-black ${sla.badgeBg}`}>
                          <Clock className="h-3 w-3" />
                          <span>{sla.text}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Endereço de Entrega com link do Maps */}
                  {order.address && (
                    <div className="mt-2.5 flex items-start justify-between gap-2 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-500" />
                        <span className="font-medium">{order.address}</span>
                      </div>
                      {activeTab === 'dispatched' && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 text-slate-400 hover:text-orange-500"
                          title="Abrir no Google Maps"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Alerta Inteligente de Pagamento / Maquininha / Troco */}
                  <div className={`mt-2.5 flex items-center gap-2.5 rounded-xl border p-2.5 text-xs ${paymentAlert.style}`}>
                    {paymentAlert.icon}
                    <div>
                      <p className="font-black tracking-tight">{paymentAlert.title}</p>
                      <p className="text-[11px] opacity-90">{paymentAlert.subtitle}</p>
                    </div>
                  </div>

                  {/* Itens do Pedido (Formatados sem repetição de observação) */}
                  <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Itens do Pedido:
                    </p>
                    {order.items?.map((item: any) => {
                      const itemName = item.name || 'Item'
                      const obsItem = (item.observation || '').trim()
                      const showObs = obsItem && obsItem.toLowerCase() !== itemName.toLowerCase()

                      return (
                        <div key={item.id} className="space-y-0.5 text-xs">
                          <div className="flex items-start justify-between font-bold text-slate-800 dark:text-slate-200">
                            <span>{item.quantity}x {itemName}</span>
                            <span>{formatBRL(item.price * item.quantity)}</span>
                          </div>
                          {Array.isArray(item.complements) && item.complements.length > 0 && (
                            <div className="pl-3 space-y-0.5 text-[11px] text-emerald-700 dark:text-emerald-400">
                              {item.complements.map((c: any, idx: number) => (
                                <span key={idx} className="block font-medium">
                                  + {c.quantity && c.quantity > 1 ? `${c.quantity}x ` : ''}{c.name} {c.price > 0 ? `(${formatBRL(c.price)})` : ''}
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

                  {/* Botões de Ação Específicos da Etapa */}
                  <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                    {order.status === 'pending' && (
                      <button
                        disabled={loadingOrderId === order.id}
                        onClick={() => handleUpdateStatus(order.id, 'in_preparation')}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-xs font-black text-slate-950 shadow-md transition-transform hover:bg-amber-400 active:scale-98"
                      >
                        <ChefHat className="h-4 w-4" />
                        <span>Aceitar e Enviar para Cozinha</span>
                      </button>
                    )}

                    {order.status === 'in_preparation' && (
                      <button
                        disabled={loadingOrderId === order.id}
                        onClick={() => handleUpdateStatus(order.id, 'dispatched')}
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
    </div>
  )
}
