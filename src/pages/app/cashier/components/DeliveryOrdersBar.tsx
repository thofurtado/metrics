import React, { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bike, ChefHat, Clock, ExternalLink, PackageCheck, Sparkles, Volume2 } from 'lucide-react'
import { api } from '@/lib/axios'
import { DeliveryOrdersDrawer } from './DeliveryOrdersDrawer'

interface DeliveryOrdersBarProps {
  sessionId?: string
  onOrderCompleted?: () => void
}

// Gerador de Som Sutíl (Ding / Chime) via Web Audio API
function playChimeSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
    osc.frequency.exponentialRampToValueAtTime(880.00, ctx.currentTime + 0.15) // A5

    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.5)
  } catch (e) {
    console.warn('Audio Context não autorizado ou não suportado', e)
  }
}

export function DeliveryOrdersBar({ sessionId, onOrderCompleted }: DeliveryOrdersBarProps) {
  const queryClient = useQueryClient()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedTab, setSelectedTab] = useState<'pending' | 'in_preparation' | 'dispatched' | 'delivered'>('pending')
  const prevPendingCount = useRef<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['cashier-online-orders'],
    queryFn: async () => {
      const res = await api.get('/public/orders/pending')
      return res.data?.orders || []
    },
    refetchInterval: 3000,
  })

  const orders: any[] = Array.isArray(data) ? data : []

  const pendingOrders = orders.filter((o) => o.status === 'pending')
  const inPrepOrders = orders.filter((o) => o.status === 'in_preparation')
  const dispatchedOrders = orders.filter((o) => o.status === 'dispatched')
  const deliveredOrders = orders.filter((o) => o.status === 'delivered')

  // Toca som suave quando entra um novo pedido pendente
  useEffect(() => {
    if (prevPendingCount.current !== null && pendingOrders.length > prevPendingCount.current) {
      playChimeSound()
    }
    prevPendingCount.current = pendingOrders.length
  }, [pendingOrders.length])

  // Escuta SSE em tempo real para atualizar instantaneamente sem precisar de F5
  useEffect(() => {
    const sseUrl = (api.defaults.baseURL || '') + '/public/orders/stream'
    let eventSource: EventSource | null = null
    try {
      eventSource = new EventSource(sseUrl)
      eventSource.addEventListener('new_order', () => {
        queryClient.invalidateQueries({ queryKey: ['cashier-online-orders'] })
        playChimeSound()
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

  // A barra fica sempre visível no turno para dar visibilidade operacional ao caixa

  const openTab = (tab: 'pending' | 'in_preparation' | 'dispatched' | 'delivered') => {
    setSelectedTab(tab)
    setIsDrawerOpen(true)
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

          {/* Pills Centrais de Status */}
          <div className="flex flex-wrap items-center gap-2">
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
              <span>{inPrepOrders.length} Na Cozinha</span>
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

      <DeliveryOrdersDrawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        initialTab={selectedTab}
        orders={orders}
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
