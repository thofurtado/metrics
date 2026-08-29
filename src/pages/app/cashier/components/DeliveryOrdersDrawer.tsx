import React, { useState } from 'react'
import { motion } from 'framer-motion'
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
  Navigation
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

  React.useEffect(() => {
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

  const getElapsedTime = (dateString?: string) => {
    if (!dateString) return ''
    const diffMin = Math.max(0, Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 60000))
    if (diffMin === 0) return 'Agora mesmo'
    if (diffMin < 60) return `Há ${diffMin} min`
    const diffH = Math.floor(diffMin / 60)
    return `Há ${diffH}h ${diffMin % 60}m`
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
                Acompanhe o fluxo operacional do pedido até a baixa no caixa
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

        {/* Abas com Objetivos Operacionais Claros */}
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
                  ? 'bg-amber-500 text-slate-950'
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

        {/* Banner Explicativo de Contexto de Cada Aba */}
        <div className="border-b border-slate-200 bg-slate-100/70 px-4 py-2 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
          {activeTab === 'pending' && (
            <p>⚡ <strong>Novos Pedidos:</strong> Revise pagamento, troco e itens antes de confirmar para produção.</p>
          )}
          {activeTab === 'in_preparation' && (
            <p>🍳 <strong>Cozinha em Produção:</strong> Acompanhe o tempo de preparo dos pratos até o despacho.</p>
          )}
          {activeTab === 'dispatched' && (
            <p>🛵 <strong>Em Rota de Entrega:</strong> Monitore o motoboy. Quando retornar, confirme e lance no caixa.</p>
          )}
          {activeTab === 'delivered' && (
            <p>✅ <strong>Histórico de Baixas:</strong> Pedidos finalizados e integrados ao caixa da sessão atual.</p>
          )}
        </div>

        {/* Lista de Pedidos */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {currentList.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center text-slate-400">
              <PackageCheck className="mb-2 h-12 w-12 opacity-30" />
              <p className="text-sm font-bold">Nenhum pedido nesta etapa</p>
              <p className="text-xs">Os pedidos em andamento aparecerão aqui automaticamente.</p>
            </div>
          ) : (
            currentList.map((order) => {
              const obs = order.observations || ''
              const hasTroco = obs.includes('Troco')
              const hasCartao = obs.includes('Cartão') || obs.includes('Débito') || obs.includes('Crédito')

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
                      {order.client_phone && (
                        <div className="mt-1 flex items-center gap-2">
                          <p className="flex items-center gap-1 text-xs text-slate-500">
                            <Phone className="h-3 w-3" /> {order.client_phone}
                          </p>
                          {activeTab === 'dispatched' && (
                            <a
                              href={`https://wa.me/55${order.client_phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                            >
                              WhatsApp
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                        {formatBRL(order.total_amount)}
                      </span>
                      <div className="flex items-center justify-end gap-1 text-[10px] font-bold text-slate-400">
                        <Clock className="h-3 w-3" />
                        <span>{getElapsedTime(order.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Endereço de Entrega */}
                  {order.address && (
                    <div className="mt-2.5 flex items-start gap-2 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-500" />
                      <span className="font-medium">{order.address}</span>
                    </div>
                  )}

                  {/* Alerta de Pagamento / Troco / Maquininha */}
                  {(hasTroco || hasCartao || obs) && (
                    <div className="mt-2 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/80 p-2.5 text-xs font-bold text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                      <span>{obs.split('\n').find((l: string) => l.includes('Pagamento')) || obs}</span>
                    </div>
                  )}

                  {/* Itens do Pedido (Formatados Limpos sem Repetição) */}
                  <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Itens do Pedido:
                    </p>
                    {order.items?.map((item: any) => {
                      const itemName = item.name || 'Item'
                      const obsItem = (item.observation || '').trim()
                      // Só exibe observação se ela existir e for DIFERENTE do nome do produto
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
                            <div className="pl-3 text-[11px] italic font-medium text-amber-700 dark:text-amber-400">
                              Obs: {obsItem}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Ações Específicas por Etapa */}
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
