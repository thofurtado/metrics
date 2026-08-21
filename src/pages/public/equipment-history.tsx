import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { Helmet } from 'react-helmet-async'
import { 
  Monitor, 
  Wrench, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  Cpu, 
  HardDrive, 
  MessageSquare, 
  Layers, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Phone,
  Package,
  FileText,
  User,
  Activity
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MetricsIcon } from '@/components/MetricsIcon'
import { cn } from '@/lib/utils'

export function EquipmentHistoryPage() {
  const { id, equipmentId } = useParams<{ id?: string; equipmentId?: string }>()
  const targetId = id || equipmentId

  // Estado para controlar quais OS estão expandidas (por padrão todas iniciam fechadas)
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({})

  const toggleOrder = (orderId: string) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }))
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['public-equipment-history', targetId],
    queryFn: async () => {
      const baseUrl = import.meta.env.VITE_API_URL || 'https://api.metrics.dev.br'
      const res = await axios.get(`${baseUrl}/public/equipments/${targetId}/history`)
      return res.data.equipment
    },
    enabled: Boolean(targetId),
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <MetricsIcon className="h-12 w-12 animate-bounce mb-4 text-indigo-400" />
        <p className="text-sm text-slate-400 font-medium animate-pulse">Carregando prontuário técnico do equipamento...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <Card className="max-w-md w-full bg-slate-900/80 border-slate-800 backdrop-blur-xl p-6 text-center shadow-2xl">
          <Monitor className="h-12 w-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white">Equipamento Não Localizado</h2>
          <p className="text-xs text-slate-400 mt-2">
            O identificador deste equipamento não foi encontrado no sistema ou a etiqueta foi desativada.
          </p>
        </Card>
      </div>
    )
  }

  const telemetry = data.telemetry || {}
  const osInfo = telemetry.osInfo || {}
  const cpu = telemetry.cpu || {}
  const mem = telemetry.mem || {}
  const memGB = mem.total ? (mem.total / 1024 ** 3).toFixed(0) : null
  const disk = telemetry.fsSize?.[0]
  const diskGB = disk?.size ? (disk.size / 1024 ** 3).toFixed(0) : null

  return (
    <>
      <Helmet title={`Prontuário ${data.identification} • Metrics TI`} />
      
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 pb-16 font-sans">
        {/* HEADER HERO */}
        <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-2xl sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                <MetricsIcon className="h-6 w-6 text-indigo-400" />
              </div>
              <div>
                <h1 className="font-extrabold text-sm tracking-tight text-white flex items-center gap-2">
                  METRICS TI
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30 py-0">
                    Verificado
                  </Badge>
                </h1>
                <p className="text-[11px] text-slate-400">Prontuário Vitalício de Manutenção</p>
              </div>
            </div>

            <Button
              asChild
              size="sm"
              className="gap-1.5 h-9 bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/25"
            >
              <a 
                href={`https://wa.me/5512997753965?text=Olá, preciso de suporte para o equipamento: ${encodeURIComponent(data.identification)} (ID: ${data.id.slice(0, 8)})`} 
                target="_blank" 
                rel="noreferrer"
              >
                <Phone className="h-3.5 w-3.5" />
                Suporte Técnico
              </a>
            </Button>
          </div>
        </header>

        {/* CONTEÚDO PRINCIPAL */}
        <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
          
          {/* CARD HERO DO EQUIPAMENTO */}
          <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-xl shadow-2xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <Monitor className="h-6 w-6 text-indigo-400" />
                  <h2 className="text-2xl font-black tracking-tight text-white">{data.identification}</h2>
                  <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-xs font-mono">
                    {data.type}
                  </Badge>
                </div>
                <p className="text-sm text-slate-400 flex items-center gap-1.5">
                  <User className="h-4 w-4 text-slate-500" />
                  <span className="font-semibold text-slate-200">{data.clientName}</span>
                  {data.groupName && <span className="text-slate-500">• {data.groupName}</span>}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-2 text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Histórico</span>
                  <p className="font-mono text-lg font-black text-emerald-400">
                    {data.totalTreatments} {data.totalTreatments === 1 ? 'O.S.' : 'O.S. Registradas'}
                  </p>
                </div>
              </div>
            </div>

            {/* ESPECIFICAÇÕES TÉCNICAS (TELEMETRIA AO VIVO) */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-slate-800/80 pt-5">
              <div className="rounded-2xl border border-slate-800/60 bg-slate-950/50 p-3">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <Monitor className="h-3.5 w-3.5 text-blue-400" /> Sistema
                </span>
                <p className="mt-1 font-semibold text-xs text-slate-200 truncate" title={osInfo.distro || osInfo.platform || 'Windows'}>
                  {osInfo.distro || osInfo.platform || 'Windows'}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800/60 bg-slate-950/50 p-3">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <Cpu className="h-3.5 w-3.5 text-purple-400" /> Processador
                </span>
                <p className="mt-1 font-semibold text-xs text-slate-200 truncate" title={cpu.brand || cpu.manufacturer || 'CPU'}>
                  {cpu.brand || cpu.manufacturer || 'Integrado'}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800/60 bg-slate-950/50 p-3">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <Activity className="h-3.5 w-3.5 text-emerald-400" /> Memória RAM
                </span>
                <p className="mt-1 font-semibold text-xs text-slate-200">
                  {memGB ? `${memGB} GB` : 'Standard'}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800/60 bg-slate-950/50 p-3">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <HardDrive className="h-3.5 w-3.5 text-amber-400" /> Armazenamento
                </span>
                <p className="mt-1 font-semibold text-xs text-slate-200">
                  {diskGB ? `${diskGB} GB` : 'Standard'}
                </p>
              </div>
            </div>
          </div>

          {/* HISTÓRICO DE ORDENS DE SERVIÇO (ACCORDIONS) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                <Wrench className="h-5 w-5 text-indigo-400" />
                Histórico de Ordens de Serviço ({data.treatments.length})
              </h3>
              <span className="text-xs text-slate-400">Clique na linha para expandir os detalhes</span>
            </div>

            {data.treatments.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center text-slate-500">
                <CheckCircle2 className="h-10 w-10 text-emerald-500/40 mx-auto mb-2" />
                <p className="font-semibold text-slate-300">Nenhuma manutenção corretiva necessária até o momento.</p>
                <p className="text-xs text-slate-500 mt-1">Este equipamento encontra-se em perfeito estado operacional.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.treatments.map((order: any) => {
                  const isExpanded = Boolean(expandedOrders[order.id])
                  const isFinished = order.status === 'resolved' || order.status === 'finished'

                  const openDate = order.openingDate 
                    ? new Date(order.openingDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                    : 'Data n/d'

                  const endDate = order.endingDate
                    ? new Date(order.endingDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                    : null

                  return (
                    <div
                      key={order.id}
                      className={cn(
                        'overflow-hidden rounded-2xl border transition-all duration-200 shadow-md',
                        isExpanded
                          ? 'border-indigo-500/50 bg-slate-900 shadow-indigo-500/5'
                          : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900',
                      )}
                    >
                      {/* CABEÇALHO DA LINHA COLAPSÁVEL (SEMPRE VISÍVEL) */}
                      <button
                        type="button"
                        onClick={() => toggleOrder(order.id)}
                        className="flex w-full items-center justify-between p-4 text-left transition-colors sm:p-5"
                      >
                        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4 truncate pr-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-400">
                              {openDate}
                            </span>
                            <Badge variant="outline" className="border-slate-700 bg-slate-800/80 font-mono text-[11px] text-slate-300">
                              #{order.id.slice(0, 8)}
                            </Badge>
                          </div>

                          <span className="truncate text-sm font-bold text-white" title={order.request}>
                            {order.request || 'Atendimento Geral de TI'}
                          </span>
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                          <Badge
                            className={cn(
                              'text-xs font-bold',
                              isFinished
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : 'bg-amber-500/15 text-amber-400 border-amber-500/30',
                            )}
                          >
                            {isFinished ? 'Concluído' : 'Em Andamento'}
                          </Badge>

                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-slate-400">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                        </div>
                      </button>

                      {/* CONTEÚDO EXPANDIDO (DETALHES RICOS DO ATENDIMENTO) */}
                      {isExpanded && (
                        <div className="border-t border-slate-800 bg-slate-950/60 p-4 sm:p-6 space-y-6">
                          
                          {/* 1. TIMELINE DE INTERAÇÕES TÉCNICAS */}
                          <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-indigo-400" />
                              Histórico das Intervenções Técnicas
                            </h4>

                            {order.interactions && order.interactions.length > 0 ? (
                              <div className="relative pl-5 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                                {order.interactions.map((inter: any) => (
                                  <div key={inter.id} className="relative">
                                    <div className="absolute -left-5 top-1.5 h-2.5 w-2.5 rounded-full bg-indigo-500 ring-4 ring-slate-950" />
                                    <div className="rounded-xl border border-slate-800/80 bg-slate-900/80 p-3">
                                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                                        <span className="font-semibold text-indigo-300">Etapa Técnica</span>
                                        <span className="font-mono">
                                          {new Date(inter.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                                        </span>
                                      </div>
                                      <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                                        {inter.observations || 'Interação sem relato adicional.'}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-500 italic pl-2">Nenhuma etapa intermediária registrada.</p>
                            )}
                          </div>

                          {/* 2. PEÇAS & SERVIÇOS APLICADOS */}
                          {order.items && order.items.length > 0 && (
                            <div className="space-y-2.5 border-t border-slate-800/80 pt-4">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                <Package className="h-3.5 w-3.5 text-emerald-400" />
                                Peças e Serviços Aplicados nesta O.S.
                              </h4>
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {order.items.map((it: any) => (
                                  <div key={it.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs">
                                    <span className="font-semibold text-slate-200">{it.name}</span>
                                    <Badge variant="secondary" className="bg-slate-800 text-slate-300 text-[10px]">
                                      Qtd: {it.quantity}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 3. LAUDO DE ENCERRAMENTO */}
                          {order.observations && (
                            <div className="rounded-2xl border border-emerald-900/40 bg-emerald-950/20 p-4">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Laudo de Entrega / Encerramento
                              </span>
                              <p className="text-xs text-emerald-200/90 leading-relaxed whitespace-pre-wrap">
                                {order.observations}
                              </p>
                              {endDate && (
                                <p className="text-[11px] font-mono text-emerald-400/60 mt-2">
                                  Concluído em: {endDate}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  )
}
