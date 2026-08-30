import React, { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Bike,
  ChefHat,
  Clock,
  ExternalLink,
  PackageCheck,
  Sparkles,
  Volume2,
  VolumeX,
  Settings2,
  Play,
  Check
} from 'lucide-react'
import { api } from '@/lib/axios'
import { DeliveryOrdersDrawer } from './DeliveryOrdersDrawer'
import {
  deliveryAlertManager,
  unlockAudioContext,
  SOUND_OPTIONS,
  SoundType
} from '@/lib/delivery-sound'
import { toast } from 'sonner'

interface DeliveryOrdersBarProps {
  sessionId?: string
  onOrderCompleted?: () => void
}

export function DeliveryOrdersBar({ sessionId, onOrderCompleted }: DeliveryOrdersBarProps) {
  const queryClient = useQueryClient()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedTab, setSelectedTab] = useState<'pending' | 'in_preparation' | 'dispatched' | 'delivered'>('pending')
  const [isMuted, setIsMuted] = useState<boolean>(() => deliveryAlertManager.getIsMuted())
  const [isSoundModalOpen, setIsSoundModalOpen] = useState(false)
  const [currentSound, setCurrentSound] = useState<SoundType>(() => deliveryAlertManager.getSoundType())

  const { data } = useQuery({
    queryKey: ['cashier-online-orders'],
    queryFn: async () => {
      const res = await api.get('/public/orders/pending')
      return res.data || { orders: [], profile: null }
    },
    refetchInterval: 3000
  })

  const orders: any[] = Array.isArray(data?.orders) ? data.orders : Array.isArray(data) ? data : []
  const profile = data?.profile || null

  const pendingOrders = orders.filter((o) => o.status === 'pending')
  const inPrepOrders = orders.filter((o) => o.status === 'in_preparation')
  const dispatchedOrders = orders.filter((o) => o.status === 'dispatched')
  const deliveredOrders = orders.filter((o) => o.status === 'delivered')

  // Desbloqueia contexto de áudio na primeira interação do usuário (Safari / iOS / Chrome)
  useEffect(() => {
    const handleUserInteraction = () => {
      unlockAudioContext()
    }
    window.addEventListener('click', handleUserInteraction, { once: true })
    window.addEventListener('touchstart', handleUserInteraction, { once: true })
    return () => {
      window.removeEventListener('click', handleUserInteraction)
      window.removeEventListener('touchstart', handleUserInteraction)
    }
  }, [])

  // Alerta sonoro contínuo e espaçado (a cada 18 segundos) enquanto houver pedidos pendentes
  useEffect(() => {
    if (pendingOrders.length > 0) {
      deliveryAlertManager.startAlert()
    } else {
      deliveryAlertManager.stopAlert()
    }
  }, [pendingOrders.length])

  // Escuta SSE em tempo real
  useEffect(() => {
    const host =
      typeof window !== 'undefined'
        ? window.location.hostname === 'localhost'
          ? 'marujo.metrics.dev.br'
          : window.location.hostname
        : ''
    const sseUrl = `${api.defaults.baseURL || ''}/public/orders/stream?tenant=${encodeURIComponent(host)}`
    let eventSource: EventSource | null = null
    try {
      eventSource = new EventSource(sseUrl)
      eventSource.addEventListener('new_order', () => {
        queryClient.invalidateQueries({ queryKey: ['cashier-online-orders'] })
        deliveryAlertManager.startAlert()
      })
      eventSource.addEventListener('order_status_updated', () => {
        queryClient.invalidateQueries({ queryKey: ['cashier-online-orders'] })
      })
    } catch (e) {
      console.warn('Erro ao conectar SSE no DeliveryOrdersBar:', e)
    }

    return () => {
      if (eventSource) eventSource.close()
    }
  }, [queryClient])

  const openTab = (tab: 'pending' | 'in_preparation' | 'dispatched' | 'delivered') => {
    setSelectedTab(tab)
    setIsDrawerOpen(true)
  }

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation()
    const nextMuted = deliveryAlertManager.toggleMute()
    setIsMuted(nextMuted)
    if (nextMuted) {
      toast.info('Alerta sonoro silenciado')
    } else {
      toast.success('Alerta sonoro ativado')
      if (pendingOrders.length > 0) {
        deliveryAlertManager.startAlert()
      }
    }
  }

  const handleSelectSound = (soundId: SoundType) => {
    setCurrentSound(soundId)
    deliveryAlertManager.setSoundType(soundId)
    toast.success('Tom de notificação atualizado!')
  }

  return (
    <>
      <div className="my-3 overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 text-white shadow-lg dark:border-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Cabeçalho da Faixa */}
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400 ring-1 ring-orange-500/30">
              <Bike className="h-5 w-5" />
              {pendingOrders.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500"></span>
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Gestor de Entregas
                </span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                  {orders.length} pedidos hoje
                </span>
              </div>
              <p className="text-sm font-bold tracking-tight text-white">
                Fluxo de Delivery do Turno
              </p>
            </div>
          </div>

          {/* Pills Centrais de Status e Controle de Som */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Botão de Silenciar / Ativar Som */}
            <button
              type="button"
              onClick={handleToggleMute}
              className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-bold transition-all active:scale-95 ${
                isMuted
                  ? 'border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
                  : pendingOrders.length > 0
                  ? 'border-amber-400/50 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 animate-pulse'
                  : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
              title={isMuted ? 'Ativar alerta sonoro' : 'Silenciar alerta sonoro'}
            >
              {isMuted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4 text-amber-400" />}
              <span>{isMuted ? 'Mudo' : 'Som Ativo'}</span>
            </button>

            {/* Botão de Escolher Som */}
            <button
              type="button"
              onClick={() => setIsSoundModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition-all"
              title="Personalizar toque de notificação"
            >
              <Settings2 className="h-4 w-4 text-slate-400" />
              <span>Toque</span>
            </button>

            {/* 1. Novos */}
            <button
              type="button"
              onClick={() => openTab('pending')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all active:scale-95 ${
                pendingOrders.length > 0
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-2 ring-amber-400/50'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>{pendingOrders.length} Novos</span>
            </button>

            {/* 2. Em Preparo */}
            <button
              type="button"
              onClick={() => openTab('in_preparation')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all active:scale-95 ${
                inPrepOrders.length > 0
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <ChefHat className="h-3.5 w-3.5" />
              <span>{inPrepOrders.length} Em Produção</span>
            </button>

            {/* 3. Na Rua */}
            <button
              type="button"
              onClick={() => openTab('dispatched')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all active:scale-95 ${
                dispatchedOrders.length > 0
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Bike className="h-3.5 w-3.5" />
              <span>{dispatchedOrders.length} Na Rua</span>
            </button>

            {/* Botão de Abrir Gestor */}
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-white/20 active:scale-95"
            >
              <span>Abrir Painel</span>
              <ExternalLink className="h-3.5 w-3.5 opacity-70" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Escolha do Som */}
      {isSoundModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Volume2 className="h-5 w-5 text-orange-500" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Escolher Som de Pedido Online
                </h3>
              </div>
              <button
                onClick={() => setIsSoundModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <p className="mt-2.5 text-xs text-slate-500">
              Ouça os timbres harmônicos abaixo e clique para selecionar o som do delivery:
            </p>

            <div className="mt-4 space-y-2">
              {SOUND_OPTIONS.map((opt) => {
                const isSelected = currentSound === opt.id
                return (
                  <div
                    key={opt.id}
                    onClick={() => handleSelectSound(opt.id)}
                    className={`flex items-center justify-between gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50/80 dark:bg-orange-950/30'
                        : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {opt.name}
                        </span>
                        {isSelected && (
                          <span className="rounded-full bg-orange-500 px-2 py-0.2 text-[9px] font-black text-white">
                            Ativo
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {opt.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        deliveryAlertManager.previewSound(opt.id)
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      title="Ouvir demonstração deste som"
                    >
                      <Play className="h-3 w-3 text-orange-500 fill-orange-500" />
                      <span>Ouvir</span>
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setIsSoundModalOpen(false)}
                className="rounded-xl bg-orange-600 px-4 py-2 text-xs font-black text-white shadow-md hover:bg-orange-500"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      <DeliveryOrdersDrawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        initialTab={selectedTab}
        orders={orders}
        profile={profile}
        sessionId={sessionId}
        onOrderCompleted={() => {
          queryClient.invalidateQueries({ queryKey: ['cashier-online-orders'] })
          queryClient.invalidateQueries({ queryKey: ['cashier-session', sessionId] })
          if (onOrderCompleted) onOrderCompleted()
        }}
      />
    </>
  )
}
