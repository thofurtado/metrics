import React, { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Bike,
  ChefHat,
  Clock,
  ExternalLink,
  Volume2,
  VolumeX,
  Play,
  Check,
  X
} from 'lucide-react'
import { api, API_BASE_URL } from '@/lib/axios'
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
  const [isSoundDropdownOpen, setIsSoundDropdownOpen] = useState(false)
  const [currentSound, setCurrentSound] = useState<SoundType>(() => deliveryAlertManager.getSoundType())
  const soundDropdownRef = useRef<HTMLDivElement>(null)

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
  const orphanOrders = orders.filter((o) => !o.caixa_id && !o.cashier_session_id)
  const [associatingOrphans, setAssociatingOrphans] = useState(false)

  const handleAssociateOrphans = async () => {
    if (!sessionId) return
    setAssociatingOrphans(true)
    try {
      const res = await api.post('/public/orders/associate-orphans', {
        cashier_session_id: sessionId
      })
      toast.success(res.data.message || 'Pedidos vinculados com sucesso ao caixa!')
      queryClient.invalidateQueries({ queryKey: ['cashier-online-orders'] })
      queryClient.invalidateQueries({ queryKey: ['cashier-session', sessionId] })
      if (onOrderCompleted) onOrderCompleted()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao vincular pedidos órfãos.')
    } finally {
      setAssociatingOrphans(false)
    }
  }

  // Sincroniza o alerta sonoro: toca APENAS enquanto houver pedidos pendentes (Novos)
  // Se a contagem for 0, silencia e limpa o timer imediatamente.
  useEffect(() => {
    deliveryAlertManager.syncPendingOrders(pendingOrders.length)

    return () => {
      deliveryAlertManager.stopAlert()
    }
  }, [pendingOrders.length])

  // Fecha dropdown de som ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (soundDropdownRef.current && !soundDropdownRef.current.contains(e.target as Node)) {
        setIsSoundDropdownOpen(false)
      }
    }
    if (isSoundDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isSoundDropdownOpen])

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

  // Escuta SSE em tempo real para atualizar o cache do React Query
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

  // Fica 100% invisível até a primeira entrega ser lançada no turno
  if (orders.length === 0) {
    return null
  }

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
    }
  }

  const handleSelectSound = (soundId: SoundType) => {
    setCurrentSound(soundId)
    deliveryAlertManager.setSoundType(soundId)
    toast.success('Toque atualizado!')
  }

  return (
    <>
      {sessionId && orphanOrders.length > 0 && (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200 animate-fade-in shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <span>
              Existem <strong>{orphanOrders.length}</strong> pedido(s) de delivery de hoje sem caixa vinculado.
            </span>
          </div>
          <button
            type="button"
            disabled={associatingOrphans}
            onClick={handleAssociateOrphans}
            className="rounded-lg bg-amber-600 px-3 py-1 text-[11px] font-black text-white hover:bg-amber-500 transition-all active:scale-98 shadow"
          >
            {associatingOrphans ? 'Vinculando...' : 'Vincular a este Caixa'}
          </button>
        </div>
      )}
      <div className="my-3 overflow-visible rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-all dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Cabeçalho Harmônico: GESTOR DE ENTREGAS / 5 pedidos hoje */}
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 ring-1 ring-orange-500/20 dark:bg-orange-500/20 dark:text-orange-400 dark:ring-orange-500/30">
              <Bike className="h-4 w-4" />
              {pendingOrders.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500"></span>
                </span>
              )}
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400">
                Gestor de Entregas
              </span>
              <p className="text-sm font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                {orders.length} {orders.length === 1 ? 'pedido nesta sessão' : 'pedidos nesta sessão'}
              </p>
            </div>
          </div>

          {/* Lado Direito: Dropdown de Som Unificado + Pills de Status */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Ícone Único com Dropdown Flutuante de Configuração de Som */}
            <div className="relative" ref={soundDropdownRef}>
              <button
                type="button"
                onClick={() => setIsSoundDropdownOpen((prev) => !prev)}
                className={`flex h-8 w-8 items-center justify-center rounded-xl border transition-all active:scale-95 ${
                  isMuted
                    ? 'border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20'
                    : pendingOrders.length > 0
                    ? 'border-amber-400/50 bg-amber-500/20 text-amber-600 dark:text-amber-300 animate-pulse'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white'
                }`}
                title={isMuted ? 'Áudio de pedidos silenciado (Clique para configurar)' : 'Configurar alerta sonoro'}
              >
                {isMuted ? <VolumeX className="h-4 w-4 text-rose-500" /> : <Volume2 className="h-4 w-4" />}
              </button>

              {/* Dropdown Flutuante de Som */}
              {isSoundDropdownOpen && (
                <div className="absolute right-0 top-10 z-50 w-72 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xl dark:border-slate-800 dark:bg-slate-900 text-slate-900 dark:text-white animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between border-b pb-2.5 dark:border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <Volume2 className="h-4 w-4 text-orange-500" />
                      <span className="text-xs font-black">Alerta de Novos Pedidos</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsSoundDropdownOpen(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Toggle Mudo / Ativo */}
                  <div className="my-2.5 flex items-center justify-between rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {isMuted ? 'Som desativado' : 'Som ativado'}
                    </span>
                    <button
                      type="button"
                      onClick={handleToggleMute}
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                        isMuted
                          ? 'bg-rose-500 text-white hover:bg-rose-600'
                          : 'bg-emerald-600 text-white hover:bg-emerald-500'
                      }`}
                    >
                      {isMuted ? 'Ativar' : 'Silenciar'}
                    </button>
                  </div>

                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Escolher Toque:
                  </p>

                  <div className="space-y-1.5">
                    {SOUND_OPTIONS.map((opt) => {
                      const isSelected = currentSound === opt.id
                      return (
                        <div
                          key={opt.id}
                          onClick={() => handleSelectSound(opt.id)}
                          className={`flex items-center justify-between gap-2 rounded-xl p-2 cursor-pointer transition-all border ${
                            isSelected
                              ? 'border-orange-500/80 bg-orange-50/80 text-orange-950 dark:bg-orange-950/30 dark:text-orange-200'
                              : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              {isSelected && <Check className="h-3 w-3 text-orange-600" />}
                              <span className="text-xs font-bold truncate">{opt.name}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              deliveryAlertManager.previewSound(opt.id)
                            }}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                            title="Ouvir toque"
                          >
                            <Play className="h-2.5 w-2.5 text-orange-500 fill-orange-500" />
                            <span>Ouvir</span>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 1. Novos */}
            <button
              type="button"
              onClick={() => openTab('pending')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                pendingOrders.length > 0
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-2 ring-amber-400/50'
                  : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>{pendingOrders.length} Novos</span>
            </button>

            {/* 2. Em Preparo */}
            <button
              type="button"
              onClick={() => openTab('in_preparation')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                inPrepOrders.length > 0
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                  : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white'
              }`}
            >
              <ChefHat className="h-3.5 w-3.5" />
              <span>{inPrepOrders.length} Em Produção</span>
            </button>

            {/* 3. Na Rua */}
            <button
              type="button"
              onClick={() => openTab('dispatched')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                dispatchedOrders.length > 0
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white'
              }`}
            >
              <Bike className="h-3.5 w-3.5" />
              <span>{dispatchedOrders.length} Na Rua</span>
            </button>

            {/* Botão de Abrir Gestor */}
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition-all hover:bg-slate-200 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white active:scale-95"
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
